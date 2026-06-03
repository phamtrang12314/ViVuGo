package com.vivugo.backend.admin.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.vivugo.backend.admin.dto.response.booking.BookingAdminResponse;
import com.vivugo.backend.admin.dto.response.booking.BookingDetailResponse;
import com.vivugo.backend.admin.dto.response.booking.BookingStatsResponse;
import com.vivugo.backend.admin.dto.response.tour.TourParticipantsResponse;
import com.vivugo.backend.exception.ResourceNotFoundException;
import com.vivugo.backend.model.*;
import com.vivugo.backend.model.enums.BookingStatus;
import com.vivugo.backend.model.enums.PaymentStatus;
import com.vivugo.backend.model.enums.RefundStatus;
import com.vivugo.backend.repository.BookingRepository;
import com.vivugo.backend.realtime.RealtimePublisher;
import com.vivugo.backend.service.EmailService;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.time.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookingAdminService {

    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final RealtimePublisher realtimePublisher;

    public BookingAdminService(BookingRepository bookingRepository, EmailService emailService, RealtimePublisher realtimePublisher) {
        this.bookingRepository = bookingRepository;
        this.emailService = emailService;
        this.realtimePublisher = realtimePublisher;
    }

    /**
     * xây khoảng thời gian
     */

    private LocalDateTime[] buildRange(LocalDate fromDate, LocalDate toDate) {
        // Không có tham số thời gian nào -> không lọc
        if (fromDate == null && toDate == null) {
//            return null;
            LocalDate today = LocalDate.now();
            LocalDate from = (fromDate != null) ? fromDate : LocalDate.of(1970, 1, 1);
            LocalDate to = (toDate != null) ? toDate : today;

            LocalDateTime start = from.atStartOfDay();
            LocalDateTime end = to.atTime(LocalTime.MAX);
            return new LocalDateTime[]{start, end};
        }


        // Nếu chỉ có 1 đầu thì cho đầu kia một giá trị "mặc định rộng"
        LocalDate from = (fromDate != null) ? fromDate : LocalDate.of(1970, 1, 1);
        LocalDate to = (toDate != null) ? toDate : LocalDate.of(2100, 12, 31);

        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);

        return new LocalDateTime[]{start, end};
    }

    public Page<BookingAdminResponse> getAllBookings(
            int page,
            int size,
            String search,
            BookingStatus status,
            String sort,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        LocalDateTime[] range = buildRange(fromDate, toDate);
        LocalDateTime start = range[0];
        LocalDateTime end = range[1];

        Sort sortSpec;
        switch (sort == null ? "" : sort) {
            case "newest" -> sortSpec = Sort.by(Sort.Direction.DESC, "bookingDate");
            case "oldest" -> sortSpec = Sort.by(Sort.Direction.ASC, "bookingDate");
            case "priceDesc" -> sortSpec = Sort.by(Sort.Direction.DESC, "finalAmount");
            case "priceAsc" -> sortSpec = Sort.by(Sort.Direction.ASC, "finalAmount");
            default -> sortSpec = Sort.by(Sort.Direction.DESC, "bookingDate");
        }

        Pageable pageable = PageRequest.of(page, size, sortSpec);

        Specification<Booking> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // lọc theo khoảng thời gian đặt
//            predicates.add(cb.between(root.get("bookingDate"), start, end));
            if (start != null && end != null) {
                predicates.add(cb.between(root.get("bookingDate"), start, end));
            }

            // search: mã booking, tên user, tên tour
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";

                Predicate byCode = cb.like(cb.lower(root.get("bookingID")), pattern);
                Predicate byUser = cb.like(
                        cb.lower(root.join("user").get("name")),
                        pattern
                );
                Predicate byTour = cb.like(
                        cb.lower(root.join("tour").get("title")),
                        pattern
                );

                predicates.add(cb.or(byCode, byUser, byTour));
            }

            // filter status
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Booking> pageData = bookingRepository.findAll(spec, pageable);
        return pageData.map(BookingAdminResponse::new);
    }

    public BookingStatsResponse getStats(LocalDate fromDate, LocalDate toDate) {
        LocalDateTime[] range = buildRange(fromDate, toDate);
        LocalDateTime start = range[0];
        LocalDateTime end = range[1];

        long total = bookingRepository.countByBookingDateBetween(start, end);
        long processing = bookingRepository.countByBookingDateBetweenAndStatus(start, end, BookingStatus.PROCESSING);
        long confirmed = bookingRepository.countByBookingDateBetweenAndStatus(start, end, BookingStatus.CONFIRMED);
        long completed = bookingRepository.countByBookingDateBetweenAndStatus(start, end, BookingStatus.COMPLETED);
        long canceled = bookingRepository.countByBookingDateBetweenAndStatus(start, end, BookingStatus.CANCELED);

        return new BookingStatsResponse(total, processing, confirmed, completed, canceled);
    }

    /**
     * ấy thông tin chi tiết
     */
    @Transactional
    public BookingDetailResponse getBookingDetail(String bookingID) {
        Booking booking = bookingRepository.findById(bookingID)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingID));

        BookingDetailResponse dto = new BookingDetailResponse();

        // Booking basic
        dto.setBookingID(booking.getBookingID());
        dto.setBookingDate(booking.getBookingDate());
        dto.setStatus(booking.getStatus());
        dto.setNumAdults(booking.getNumAdults());
        dto.setNumChildren(booking.getNumChildren());
        dto.setTotalPrice(booking.getTotalPrice() != null ? booking.getTotalPrice() : 0.0);
        dto.setDiscountAmount(booking.getDiscountAmount() != null ? booking.getDiscountAmount() : 0.0);
        dto.setFinalAmount(booking.getFinalAmount() != null ? booking.getFinalAmount() : 0.0);
        dto.setRefundStatus(resolveRefundStatus(booking));
        dto.setRefundedAt(booking.getRefundedAt());
        dto.setCancellationReason(booking.getCancellationReason());

        // ===== Customer =====
        User user = booking.getUser();
        if (user != null) {
            BookingDetailResponse.CustomerInfo c = new BookingDetailResponse.CustomerInfo();
            c.setUserID(user.getUserID());
            c.setName(user.getName());
            c.setEmail(user.getEmail());
            c.setPhone(user.getPhoneNumber());
            dto.setCustomer(c);
        }

        // ===== Tour =====
        Tour tour = booking.getTour();
        if (tour != null) {
            BookingDetailResponse.TourInfo t = new BookingDetailResponse.TourInfo();
            t.setTourID(tour.getTourID());
            t.setName(tour.getTitle());
            t.setCode(null); // chưa có field code, sau này có thì map vào
            t.setDepartureDate(tour.getStartDate());
            t.setDestinationName(null); // nếu bạn có Destination thì map lại sau
            dto.setTour(t);
        }

        // ===== Promotion =====
        Promotion promotion = booking.getPromotion();
        if (promotion != null) {
            BookingDetailResponse.PromotionInfo p = new BookingDetailResponse.PromotionInfo();
            p.setPromotionID(promotion.getPromotionID());
            p.setCode(promotion.getTitle()); // dùng title như code
            // name: ưu tiên description, fallback title
            String name = promotion.getDescription() != null && !promotion.getDescription().isBlank()
                    ? promotion.getDescription()
                    : promotion.getTitle();
            p.setName(name);
            p.setDiscountPercent(promotion.getDiscountPercentage());
            dto.setPromotion(p);
        }

        // ===== Invoice + Payments =====
        Invoice invoice = booking.getInvoice();
        if (invoice != null) {
            BookingDetailResponse.InvoiceInfo inv = new BookingDetailResponse.InvoiceInfo();
            inv.setInvoiceID(invoice.getInvoiceID());
            inv.setTotalAmount(invoice.getTotalAmount());
            inv.setTaxPercentage(invoice.getTaxPercentage());
            inv.setCreatedAt(invoice.getCreatedAt());
            dto.setInvoice(inv);

            // Payments
            List<Payment> payments = invoice.getPayments() == null
                    ? Collections.emptyList()
                    : new ArrayList<>(invoice.getPayments());

            List<BookingDetailResponse.PaymentInfo> paymentDtos = payments.stream().map(pay -> {
                BookingDetailResponse.PaymentInfo pi = new BookingDetailResponse.PaymentInfo();
                pi.setPaymentID(pay.getPaymentID());
                pi.setAmountPaid(pay.getAmountPaid());
                pi.setPaymentDate(pay.getPaymentDate());
                pi.setStatus(pay.getStatus());
                pi.setPaymentMethod(pay.getPaymentMethod());
                pi.setTransactionCode(pay.getTransactionCode());
                return pi;
            }).collect(Collectors.toList());

            dto.setPayments(paymentDtos);
        } else {
            dto.setInvoice(null);
            dto.setPayments(Collections.emptyList());
        }

        // ===== Participants =====
        List<Participant> participants = booking.getParticipants() == null
                ? Collections.emptyList()
                : new ArrayList<>(booking.getParticipants());

        List<BookingDetailResponse.ParticipantInfo> participantDtos = participants.stream().map(pa -> {
            BookingDetailResponse.ParticipantInfo info = new BookingDetailResponse.ParticipantInfo();
            info.setParticipantID(pa.getParticipantID());
            info.setCustomerName(pa.getCustomerName());
            info.setCustomerPhone(pa.getCustomerPhone());
            info.setIdentification(pa.getIdentification());
            info.setGender(pa.getGender() != null ? pa.getGender().name() : null);
            info.setParticipantType(pa.getParticipantType() != null ? pa.getParticipantType().name() : null);
            return info;
        }).collect(Collectors.toList());

        dto.setParticipants(participantDtos);

        return dto;
    }

    public TourParticipantsResponse getParticipantsByTour(String tourId) {
        // Lấy tất cả booking thuộc tour, bỏ booking đã hủy
        List<Booking> bookings =
                bookingRepository.findByTour_TourIDAndStatusNot(tourId, BookingStatus.CANCELED);

        TourParticipantsResponse res = new TourParticipantsResponse();
        res.setTourId(tourId);

        if (bookings.isEmpty()) {
            res.setTourName(null);
            res.setParticipants(List.of());
            return res;
        }

        Tour tour = bookings.get(0).getTour();
        res.setTourName(tour.getTitle());
        res.setStartDate(tour.getStartDate());
        res.setEndDate(tour.getEndDate());

        List<TourParticipantsResponse.ParticipantInfo> participantInfos =
                bookings.stream()
                        .filter(b -> b.getParticipants() != null)
                        .flatMap(b -> b.getParticipants().stream().map(p -> {
                            TourParticipantsResponse.ParticipantInfo dto =
                                    new TourParticipantsResponse.ParticipantInfo();
                            dto.setParticipantId(p.getParticipantID());
                            dto.setFullName(p.getCustomerName());
                            dto.setPhone(p.getCustomerPhone());
                            dto.setIdentification(p.getIdentification());
                            dto.setGender(p.getGender() != null ? p.getGender().name() : null);
                            dto.setParticipantType(p.getParticipantType() != null ? p.getParticipantType().name() : null);

                            dto.setBookingId(b.getBookingID());
                            dto.setBookingDate(b.getBookingDate());
                            dto.setBookingStatus(b.getStatus());

                            return dto;
                        }))
                        .toList();

        res.setParticipants(participantInfos);
        return res;
    }

    //    tạo file
    public byte[] exportParticipantsByTour(String tourId) throws Exception {
        TourParticipantsResponse dto = getParticipantsByTour(tourId);
        if (dto == null) {
            throw new IllegalArgumentException("Không tìm thấy tour hoặc không có dữ liệu.");
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(document, baos);
        document.open();

        // ====== FONT UNICODE TIẾNG VIỆT ======
        String fontPath = new ClassPathResource("/fonts/dejavu-sans.ttf")
                .getFile()
                .getAbsolutePath();

        BaseFont bf = BaseFont.createFont(
                fontPath,
                BaseFont.IDENTITY_H,
                BaseFont.EMBEDDED
        );
        Font titleFont = new Font(bf, 16, Font.BOLD);
        Font normalFont = new Font(bf, 11, Font.NORMAL);
        Font headerFont = new Font(bf, 11, Font.BOLD);

        // ====== TIÊU ĐỀ ======
        Paragraph title = new Paragraph("DANH SÁCH KHÁCH THAM GIA TOUR", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(12f);
        document.add(title);

        // Format ngày
        java.time.format.DateTimeFormatter df =
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

        String startStr = dto.getStartDate() != null ? dto.getStartDate().format(df) : "-";
        String endStr = dto.getEndDate() != null ? dto.getEndDate().format(df) : "-";

        // ====== THÔNG TIN TOUR ======
        Paragraph tourLine1 = new Paragraph(
                "Tour: " + (dto.getTourName() != null ? dto.getTourName() : dto.getTourId()),
                normalFont
        );
        tourLine1.setSpacingAfter(3f);
        document.add(tourLine1);

        if (dto.getDestinationName() != null && !dto.getDestinationName().isBlank()) {
            Paragraph dest = new Paragraph(
                    "Điểm đến: " + dto.getDestinationName(),
                    normalFont
            );
            dest.setSpacingAfter(3f);
            document.add(dest);
        }

        Paragraph timeInfo = new Paragraph(
                "Khởi hành: " + startStr + "    ·    Kết thúc: " + endStr,
                normalFont
        );
        timeInfo.setSpacingAfter(3f);
        document.add(timeInfo);

        // Tổng số khách
        Paragraph totalInfo = new Paragraph(
                "Tổng số khách tham gia: " + dto.getParticipants().size(),
                normalFont
        );
        totalInfo.setSpacingAfter(10f);
        document.add(totalInfo);

        // Bảng danh sách khách
        PdfPTable table = new PdfPTable(5); // 5 cột
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3f, 3f, 3f, 2f, 2f}); // 5 số tương ứng 5 cột
        table.setHeaderRows(1);

        // helper header cell
        PdfPCell headerCell;

        String[] headers = new String[]{
                "Tên khách",
                "Điện thoại",
                "Giấy tờ",
                "Giới tính",
                "Loại khách"
        };

        for (String h : headers) {
            headerCell = new PdfPCell(new Phrase(h, headerFont));
            headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            headerCell.setBackgroundColor(BaseColor.LIGHT_GRAY);
            headerCell.setPadding(5f);
            table.addCell(headerCell);
        }

        for (TourParticipantsResponse.ParticipantInfo p : dto.getParticipants()) {
            table.addCell(new Phrase(
                    nvl(p.getFullName()), normalFont
            ));
            table.addCell(new Phrase(
                    nvl(p.getPhone()), normalFont
            ));
            table.addCell(new Phrase(
                    nvl(p.getIdentification()), normalFont
            ));
            table.addCell(new Phrase(
                    mapGender(p.getGender()), normalFont
            ));
            table.addCell(new Phrase(
                    mapParticipantType(p.getParticipantType()), normalFont
            ));

        }

        document.add(table);
        document.close();

        return baos.toByteArray();
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    private String mapGender(String gender) {
        if (gender == null) return "";
        return switch (gender) {
            case "MALE" -> "Nam";
            case "FEMALE" -> "Nữ";
            default -> "Khác";
        };
    }

    private String mapParticipantType(String type) {
        if (type == null) return "";
        return switch (type) {
            case "ADULT" -> "Người lớn";
            case "CHILD" -> "Trẻ em";
            default -> type;
        };
    }

    public Page<BookingAdminResponse> getCanceledBookings(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "bookingDate"));
        Page<Booking> pageData = bookingRepository.findByStatus(BookingStatus.CANCELLATION_REQUESTED, pageable);
        return pageData.map(BookingAdminResponse::new);
    }

    // duyệt hủy 1 booking + gửi email
    @Transactional
    public void approveCancelBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        if (booking.getStatus() != BookingStatus.CANCELLATION_REQUESTED) {
            throw new IllegalStateException("Booking không ở trạng thái CHỜ HỦY");
        }

        // cập nhật trạng thái
        booking.setStatus(BookingStatus.CANCELED);
        if (resolvePaymentStatus(booking) == PaymentStatus.SUCCESS && booking.getRefundStatus() == null) {
            booking.setRefundStatus(RefundStatus.PENDING);
        }
        Booking savedBooking = bookingRepository.save(booking);
        realtimePublisher.publishBookingEvent("BOOKING_STATUS_CHANGED", savedBooking);

        // chuẩn bị data email
        if (booking.getUser() != null && booking.getUser().getEmail() != null) {
            var user = booking.getUser();
            var tour = booking.getTour();

            EmailService.BookingCanceledEmailData data =
                    EmailService.BookingCanceledEmailData.builder()
                            .toEmail(user.getEmail())
                            .customerName(user.getName())
                            .bookingId(booking.getBookingID())
                            .tourTitle(tour != null ? tour.getTitle() : "(Không rõ tên tour)")
                            .startDate(tour != null ? tour.getStartDate() : null)
                            .numAdults(booking.getNumAdults())
                            .numChildren(booking.getNumChildren())
                            .finalAmount(booking.getFinalAmount())
                            .build();

            emailService.sendBookingCanceledEmail(data);
        }
    }

    // Thêm method duyệt hủy
    public void approveCancel(Long bookingId) {
        Booking booking = bookingRepository.findById(String.valueOf(bookingId))
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (booking.getStatus() == BookingStatus.CANCELLATION_REQUESTED) {
            booking.setStatus(BookingStatus.CANCELED);
            if (resolvePaymentStatus(booking) == PaymentStatus.SUCCESS && booking.getRefundStatus() == null) {
                booking.setRefundStatus(RefundStatus.PENDING);
            }
            Booking savedBooking = bookingRepository.save(booking);
            realtimePublisher.publishBookingEvent("BOOKING_STATUS_CHANGED", savedBooking);
        }
    }

    @Transactional
    public void markRefunded(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));

        if (booking.getStatus() != BookingStatus.CANCELED) {
            throw new IllegalStateException("Chỉ đánh dấu hoàn tiền cho booking đã hủy");
        }

        if (resolvePaymentStatus(booking) != PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Booking chưa có thanh toán thành công");
        }

        booking.setRefundStatus(RefundStatus.REFUNDED);
        booking.setRefundedAt(LocalDateTime.now());
        Booking savedBooking = bookingRepository.save(booking);
        realtimePublisher.publishBookingEvent("REFUND_UPDATED", savedBooking);
    }

    @Transactional
    public void keepBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));

        if (booking.getStatus() != BookingStatus.CANCELLATION_REQUESTED) {
            throw new IllegalStateException("Booking không ở trạng thái CHỜ HỦY");
        }

        // Chuyển về CONFIRMED
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setRefundStatus(null);
        booking.setRefundedAt(null);
        Booking savedBooking = bookingRepository.save(booking);
        realtimePublisher.publishBookingEvent("BOOKING_STATUS_CHANGED", savedBooking);

    }

    private PaymentStatus resolvePaymentStatus(Booking booking) {
        if (booking == null || booking.getInvoice() == null
                || booking.getInvoice().getPayments() == null
                || booking.getInvoice().getPayments().isEmpty()) {
            return PaymentStatus.PENDING;
        }

        return booking.getInvoice().getPayments().stream()
                .max(java.util.Comparator.comparing(Payment::getPaymentDate))
                .map(Payment::getStatus)
                .orElse(PaymentStatus.PENDING);
    }

    private RefundStatus resolveRefundStatus(Booking booking) {
        if (booking.getRefundStatus() != null) {
            return booking.getRefundStatus();
        }

        if (resolvePaymentStatus(booking) == PaymentStatus.SUCCESS
                && (booking.getStatus() == BookingStatus.CANCELED
                || booking.getStatus() == BookingStatus.CANCELLATION_REQUESTED)) {
            return RefundStatus.PENDING;
        }

        return null;
    }


}
