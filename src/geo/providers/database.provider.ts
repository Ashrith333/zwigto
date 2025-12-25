import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { EligibleRestaurant } from '../interfaces/eligible-restaurant.interface';

@Injectable()
export class DatabaseProvider implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly AVERAGE_SPEED_KMH = 30; // Average city speed in km/h
  private readonly KM_TO_METERS = 1000;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres.lreibhelpqsfnefnthtc:Ashashashash333@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT NOW()');
      await this.pool.query('SELECT PostGIS_version()');
      console.log('Geo module database connection established with PostGIS');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Circuit breaker') || errorMessage.includes('authentication')) {
        console.warn('⚠️  Geo module: Database connection failed (circuit breaker or auth issue). Will retry on first query.');
      } else {
        console.warn('⚠️  Geo module: Database connection failed. Will retry on first query.');
      }
      // Don't throw - allow app to start
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /**
   * Finds eligible restaurants along a route using PostGIS.
   * 
   * SQL Query Explanation:
   * 1. Creates points from route coordinates (A → B polyline)
   * 2. Calculates route length by summing ST_DistanceSphere between consecutive points
   * 3. For each restaurant, calculates:
   *    - Distance from route start (A) to restaurant using ST_DistanceSphere
   *    - Distance from restaurant to route end (B) using ST_DistanceSphere
   *    - Detour distance = (A → Restaurant → B) - (A → B route length)
   * 4. Converts detour distance to time: distance_meters / (speed_kmh * 1000 / 60)
   * 5. Filters restaurants where detour_time <= buffer_time_minutes
   * 6. Only includes ACTIVE restaurants
   * 
   * PostGIS Functions Used:
   * - ST_SetSRID(ST_MakePoint(lng, lat), 4326): Creates a point in WGS84
   * - ST_DistanceSphere: Calculates distance in meters using spherical geometry (works with 4326)
   * - ST_StartPoint: Gets the first point of a LineString
   * - ST_EndPoint: Gets the last point of a LineString
   */
  async findEligibleRestaurants(
    routePoints: Array<{ latitude: number; longitude: number }>,
    bufferTimeMinutes: number,
  ): Promise<EligibleRestaurant[]> {
    if (routePoints.length < 2) {
      return [];
    }

    // Calculate route length by summing distances between consecutive points
    const routeLengthCalculation = routePoints
      .slice(1)
      .map((point, index) => {
        const prevPoint = routePoints[index];
        return `ST_DistanceSphere(
          ST_SetSRID(ST_MakePoint(${prevPoint.longitude}, ${prevPoint.latitude}), 4326),
          ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)
        )`;
      })
      .join(' + ');

    const query = `
      WITH route_points AS (
        SELECT ARRAY[
          ${routePoints.map((p) => `ST_SetSRID(ST_MakePoint(${p.longitude}, ${p.latitude}), 4326)`).join(',\n          ')}
        ] AS points
      ),
      route_geometry AS (
        SELECT 
          points[1] AS start_point,
          points[array_length(points, 1)] AS end_point,
          ${routeLengthCalculation} AS route_length_meters
        FROM route_points
      )
      SELECT 
        r.id AS restaurant_id,
        ROUND(
          (
            ST_DistanceSphere(
              rg.start_point,
              ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)
            ) +
            ST_DistanceSphere(
              ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326),
              rg.end_point
            ) -
            rg.route_length_meters
          ) / (${this.AVERAGE_SPEED_KMH} * ${this.KM_TO_METERS} / 60.0),
          2
        ) AS detour_time_minutes
      FROM restaurants r
      CROSS JOIN route_geometry rg
      WHERE r.status = 'ACTIVE'
        AND r.longitude IS NOT NULL
        AND r.latitude IS NOT NULL
        AND (
          ST_DistanceSphere(
            rg.start_point,
            ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)
          ) +
          ST_DistanceSphere(
            ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326),
            rg.end_point
          ) -
          rg.route_length_meters
        ) / (${this.AVERAGE_SPEED_KMH} * ${this.KM_TO_METERS} / 60.0) <= $1
      ORDER BY detour_time_minutes ASC
    `;

    const result: QueryResult = await this.pool.query(query, [bufferTimeMinutes]);

    return result.rows.map((row) => ({
      restaurant_id: row.restaurant_id,
      detour_time_minutes: parseFloat(row.detour_time_minutes),
    }));
  }

}

