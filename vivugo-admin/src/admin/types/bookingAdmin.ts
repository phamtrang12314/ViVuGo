import type { BookingStatus } from "./bookingStatus";
import type { PaymentStatus } from "./paymentStatus";

export type RefundStatus = "PENDING" | "REFUNDED";

export interface BookingAdmin {
  bookingID: string;
  bookingDate: string;

  customerName: string;
  numGuests: number;

  tourName: string;
  departureDate: string | null;

  finalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  cancellationReason?: string | null;
}

export interface BookingAdminListParams {
  page?: number;
  size?: number;
  search?: string;
  status?: BookingStatus;
  sort?: "newest" | "oldest" | "priceDesc" | "priceAsc";
  fromDate?: string; // yyyy-MM-dd
  toDate?: string;   // yyyy-MM-dd
}

export interface BookingStatsAdmin {
  total: number;
  processing: number;
  confirmed: number;
  completed: number;
  canceled: number;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  number: number;
  size: number;
  totalElements: number;
}

// Chi tiết booking

export interface BookingDetailAdmin {
  bookingID: string;
  bookingDate: string;
  status: BookingStatus;
  refundStatus?: RefundStatus | null;
  refundedAt?: string | null;
  cancellationReason?: string | null;

  numAdults: number;
  numChildren: number;
  totalPrice: number;
  discountAmount: number;
  finalAmount: number;

  customer: {
    userID: string;
    name: string;
    email: string;
    phone?: string;
  };

  tour: {
    tourID: string;
    name: string;
    code?: string | null;
    departureDate?: string | null;
    destinationName?: string | null;
  };

  promotion?: {
    promotionID: string;
    code: string;
    name: string;
    discountPercent?: number | null;
  } | null;

  invoice?: {
    invoiceID: string;
    totalAmount: number;
    taxPercentage?: number | null;
    createdAt: string;
  } | null;

  payments: {
    paymentID: string;
    amountPaid: number;
    paymentDate: string;
    status: PaymentStatus;
    paymentMethod?: string | null;
    transactionCode?: string | null;
  }[];

  participants: {
    participantID: string;
    customerName: string;
    customerPhone?: string | null;
    identification?: string | null;
    gender?: string | null;
    participantType?: string | null;
  }[];
}

export interface CustomerByTourResponse {
  tourId: string;
  tourName: string | null;
  customers: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    bookingId: string;
    bookingDate: string;
    status: BookingStatus;
  }[];
}
