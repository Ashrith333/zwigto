export class RazorpayWebhookDto {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
        currency: string;
        created_at: number;
      };
    };
    order: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
  };
}

