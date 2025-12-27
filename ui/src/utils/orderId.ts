/**
 * Extracts the last 6 numeric digits from an order ID (UUID)
 * This ensures consistent display across user and restaurant views
 * while maintaining randomness from the UUID
 */
export const getOrderIdDisplay = (orderId: string): string => {
  if (!orderId) return 'N/A';
  
  // Extract all numeric digits from the UUID
  const digits = orderId.replace(/\D/g, '');
  
  // Return last 6 digits, pad with zeros if needed
  if (digits.length >= 6) {
    return digits.slice(-6);
  } else {
    // Fallback: use hash of the full ID to generate 6 digits
    let hash = 0;
    for (let i = 0; i < orderId.length; i++) {
      hash = ((hash << 5) - hash) + orderId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 1000000).toString().padStart(6, '0');
  }
};

