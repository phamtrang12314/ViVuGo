package com.vivugo.backend.controller;

import com.vivugo.backend.dto.BookingHistoryResponse;
import com.vivugo.backend.dto.BookingRequest;
import com.vivugo.backend.dto.CancelBookingRequest;
import com.vivugo.backend.model.Account;
import com.vivugo.backend.model.Booking;
import com.vivugo.backend.model.enums.PaymentStatus;
import com.vivugo.backend.service.BookingService;
import com.vivugo.backend.service.SePayTransactionSyncService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final SePayTransactionSyncService sePayTransactionSyncService;

    public BookingController(BookingService bookingService, SePayTransactionSyncService sePayTransactionSyncService) {
        this.bookingService = bookingService;
        this.sePayTransactionSyncService = sePayTransactionSyncService;
    }

    // API Tạo Booking: Trả về bookingID để frontend chuyển trang
    @PostMapping
    public ResponseEntity<?> createBooking(
            @RequestBody BookingRequest request,
            @AuthenticationPrincipal Account currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            Booking newBooking = bookingService.processBooking(request, currentUser);

            // Trả về ID của booking vừa tạo để frontend điều hướng
            Map<String, String> response = new HashMap<>();
            response.put("message", "Booking created successfully");
            response.put("bookingID", newBooking.getBookingID());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to process booking: " + e.getMessage());
        }
    }

    // API Lấy thông tin Booking: Dùng cho trang Thanh Toán (Payment Page)
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable String id) {
        try {
            Booking booking = bookingService.getBookingById(id);
            if (bookingService.resolvePaymentStatus(booking) != PaymentStatus.SUCCESS
                    && sePayTransactionSyncService.reconcileBooking(booking)) {
                booking = bookingService.getBookingById(id);
            }

            // Tạo response object thủ công để tránh lỗi vòng lặp (Infinite Recursion)
            // hoặc lỗi Lazy Loading của Hibernate khi trả về JSON
            Map<String, Object> response = new HashMap<>();
            response.put("bookingID", booking.getBookingID());
            response.put("paymentCode", booking.getBookingID().replace("-", ""));
            response.put("tourName", booking.getTour().getTitle());
            response.put("finalAmount", booking.getFinalAmount());
            response.put("status", booking.getStatus());
            response.put("paymentStatus", bookingService.resolvePaymentStatus(booking));
            response.put("paymentTimeoutSeconds", bookingService.getPaymentSecondsRemaining(booking));
            response.put("bookingDate", booking.getBookingDate());
            response.put("numAdults", booking.getNumAdults());
            response.put("numChildren", booking.getNumChildren());

            // Thông tin khách hàng (để hiển thị nếu cần)
            response.put("customerName", booking.getUser().getName());
            response.put("customerPhone", booking.getUser().getPhoneNumber());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(404).body("Booking not found");
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<BookingHistoryResponse>> getBookingHistory(
            @AuthenticationPrincipal Account currentUser
    ) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<BookingHistoryResponse> history = bookingService.getUserBookingHistory(currentUser);
        return ResponseEntity.ok(history);
    }

    @PutMapping("/{id}/cancel-request")
    public ResponseEntity<?> requestCancel(@PathVariable String id, @RequestBody(required = false) CancelBookingRequest request) {
        try {
            bookingService.requestCancelBooking(id, request == null ? null : request.getReason());
            return ResponseEntity.ok(Map.of("message", "Đã cập nhật yêu cầu hủy tour thành công"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

}
