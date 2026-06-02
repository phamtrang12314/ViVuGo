// frontend-demo/src/types/booking.type.ts

// Enum giống Backend
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type ParticipantType = "ADULT" | "CHILD";

// Thông tin người tham gia trên Form (dùng tiếng Việt cho UI)
export interface ParticipantForm {
    name: string;
    gender: "Nam" | "Nữ" | "Khác" | "";
    phone?: string;
    cccd?: string;
}

// DTO của một Participant khi gửi xuống Backend
export interface ParticipantDto {
    customerName: string;
    customerPhone?: string;
    identification?: string;
    gender: Gender;
    participantType: ParticipantType;
}

// Dữ liệu quản lý trong React Hook Form
export interface BookingFormData {
    // Thông tin người đặt (Cũng là hành khách số 1)
    bookerName: string;
    bookerPhone: string;
    bookerEmail: string;
    bookerGender: "Nam" | "Nữ" | "Khác" | ""; // [MỚI]
    bookerCccd: string; // [MỚI]

    note?: string;

    // Danh sách người đi cùng
    otherAdults: ParticipantForm[];
    children: ParticipantForm[];

    paymentMethod: "QR" | "COUNTER";
}

// Các type khác giữ nguyên
export type BookingStatus = "CONFIRMED" | "PROCESSING" | "COMPLETED" | "CANCELED" | "CANCELLATION_REQUESTED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type RefundStatus = "PENDING" | "REFUNDED";

export interface BookingDetail {
    bookingID: string;
    paymentCode?: string;
    tourName: string;
    finalAmount: number;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    bookingDate: string;
    paymentTimeoutSeconds?: number;
    numAdults: number;
    numChildren: number;
    customerName: string;
    customerPhone: string;
}

export interface BookingHistoryResponse {
    bookingID: string;
    tourID: string;
    tourTitle: string;
    tourImageURL: string;
    bookingDate: string;
    finalAmount: number;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    refundStatus?: RefundStatus | null;
    cancellationReason?: string | null;
    numAdults: number;
    numChildren: number;
}

