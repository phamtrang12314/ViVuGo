package com.vivugo.backend.realtime;

import com.vivugo.backend.model.Booking;
import com.vivugo.backend.model.enums.BookingStatus;

import java.time.LocalDateTime;

public record BookingRealtimeEvent(
        String type,
        String bookingId,
        BookingStatus status,
        String customerName,
        String tourName,
        String cancellationReason,
        LocalDateTime occurredAt
) {
    public static BookingRealtimeEvent fromBooking(String type, Booking booking) {
        return new BookingRealtimeEvent(
                type,
                booking != null ? booking.getBookingID() : null,
                booking != null ? booking.getStatus() : null,
                booking != null && booking.getUser() != null ? booking.getUser().getName() : null,
                booking != null && booking.getTour() != null ? booking.getTour().getTitle() : null,
                booking != null ? booking.getCancellationReason() : null,
                LocalDateTime.now()
        );
    }
}
