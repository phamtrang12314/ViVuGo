package com.vivugo.backend.service;

import com.vivugo.backend.model.Booking;
import jakarta.mail.Session;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.InternetAddress;
import lombok.Builder;
import lombok.Data;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Properties;

@Service
public class EmailService {

    private static final String SENDER_DISPLAY_NAME = "ViVuGo";

    private final Environment environment;

    public EmailService(Environment environment) {
        this.environment = environment;
    }

    @Data
    @Builder
    public static class PaymentSuccessEmailData {
        private String toEmail;
        private String customerName;
        private String bookingId;
        private String tourTitle;
        private LocalDate startDate;
        private int numAdults;
        private int numChildren;
        private Double finalAmount;
    }

    //  DTO cho email hủy booking
    @Data
    @Builder
    public static class BookingCanceledEmailData {
        private String toEmail;
        private String customerName;
        private String bookingId;
        private String tourTitle;
        private LocalDate startDate;
        private int numAdults;
        private int numChildren;
        private Double finalAmount;
    }

    @Async
    public void sendRegistrationSuccessEmail(String toEmail, String userName) {
        String body = String.format(
                "Xin chào %s,\n\n" +
                        "Cảm ơn bạn đã đăng ký tài khoản tại ViVuGo!\n" +
                        "Bạn đã sẵn sàng khám phá những chuyến du lịch tuyệt vời tại Việt Nam.\n\n" +
                        "Thông tin tài khoản:\n" +
                        "Tên đăng nhập (Email): %s\n\n" +
                        "Hãy đăng nhập ngay để bắt đầu đặt tour và nhận các ưu đãi hấp dẫn.\n\n" +
                        "Trân trọng,\n" +
                        "Đội ngũ ViVuGo",
                userName, toEmail);

        if (sendViaHttpProvider(toEmail, "Chào mừng bạn đến với ViVuGo - Du lịch Việt Nam!", body, null)) {
            System.out.println("Registration success email sent via HTTP provider to: " + toEmail);
            return;
        }

        for (JavaMailSenderImpl sender : gmailSenders()) {
            try {
                MimeMessage message = sender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
                helper.setFrom(sender.getUsername(), SENDER_DISPLAY_NAME);
                helper.setTo(toEmail);
                helper.setSubject("Chào mừng bạn đến với ViVuGo - Du lịch Việt Nam!");
                helper.setText(body);
                sender.send(message);
                System.out.println("Registration success email sent to: " + toEmail);
                return;
            } catch (Exception e) {
                System.err.println("Error sending registration email to " + toEmail + ": " + e.getMessage());
            }
        }
    }

    public void sendOtpEmail(String toEmail, String otpCode, String purpose, long minutes) {
        String subject = "Mã OTP xác minh đăng ký ViVuGo";
        if ("RESET_PASSWORD".equals(purpose)) {
            subject = "Mã OTP đặt lại mật khẩu ViVuGo";
        }

        String text = "Mã OTP ViVuGo của bạn là: " + otpCode
                + "\nMã có hiệu lực trong " + minutes + " phút.";
        String html = buildOtpHtml(otpCode, minutes, purpose);

        try {
            if (sendViaHttpProvider(toEmail, subject, text, html)) {
                System.out.println("OTP email sent via HTTP provider to: " + toEmail);
                return;
            }
        } catch (Exception e) {
            throw new IllegalStateException("Cannot send OTP email: " + e.getMessage(), e);
        }

        RuntimeException lastError = null;
        for (JavaMailSenderImpl sender : gmailSenders()) {
            try {
                MimeMessage message = sender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(sender.getUsername(), SENDER_DISPLAY_NAME);
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(text, html);
                sender.send(message);
                System.out.println("OTP email sent to: " + toEmail);
                return;
            } catch (Exception e) {
                lastError = new IllegalStateException("Cannot send OTP email: " + mailFailureMessage(e), e);
                System.err.println("Error sending OTP email to " + toEmail + ": " + e.getMessage());
            }
        }

        throw lastError != null ? lastError : new IllegalStateException("Cannot send OTP email");
    }

    public boolean hasMailCredentials() {
        if (hasHttpMailProvider()) {
            return true;
        }

        String username = firstNonBlank(
                environment.getProperty("MAIL_USERNAME"),
                environment.getProperty("EMAIL_USER"),
                environment.getProperty("SPRING_MAIL_USERNAME"),
                environment.getProperty("spring.mail.username")
        );
        String password = firstNonBlank(
                environment.getProperty("MAIL_PASSWORD"),
                environment.getProperty("EMAIL_PASS"),
                environment.getProperty("SPRING_MAIL_PASSWORD"),
                environment.getProperty("spring.mail.password")
        );

        return username != null
                && password != null
                && !username.contains("your_email")
                && !username.contains("your-gmail")
                && !password.contains("your_app_password")
                && !password.contains("your-16-character-gmail-app-password");
    }

    private List<JavaMailSenderImpl> gmailSenders() {
        String username = firstNonBlank(
                environment.getProperty("MAIL_USERNAME"),
                environment.getProperty("EMAIL_USER"),
                environment.getProperty("SPRING_MAIL_USERNAME"),
                environment.getProperty("spring.mail.username")
        );
        String password = firstNonBlank(
                environment.getProperty("MAIL_PASSWORD"),
                environment.getProperty("EMAIL_PASS"),
                environment.getProperty("SPRING_MAIL_PASSWORD"),
                environment.getProperty("spring.mail.password")
        );
        String host = firstNonBlank(
                environment.getProperty("MAIL_HOST"),
                environment.getProperty("spring.mail.host"),
                "smtp.gmail.com"
        );
        int primaryPort = parsePort(firstNonBlank(
                environment.getProperty("MAIL_PORT"),
                environment.getProperty("spring.mail.port"),
                "587"
        ));

        if (username == null || password == null
                || username.contains("your_email")
                || username.contains("your-gmail")
                || password.contains("your_app_password")
                || password.contains("your-16-character-gmail-app-password")) {
            throw new IllegalStateException(
                    "Missing mail credentials. Set MAIL_USERNAME/MAIL_PASSWORD or EMAIL_USER/EMAIL_PASS."
            );
        }

        password = password.replaceAll("\\s+", "");
        List<JavaMailSenderImpl> senders = new ArrayList<>();
        senders.add(createSender(host, primaryPort, username, password));
        String fallbackPortValue = firstNonBlank(
                environment.getProperty("MAIL_FALLBACK_PORT"),
                environment.getProperty("spring.mail.fallback-port")
        );
        if (fallbackPortValue != null) {
            int fallbackPort = parsePort(fallbackPortValue);
            if (fallbackPort != primaryPort) {
                senders.add(createSender(host, fallbackPort, username, password));
            }
        }
        return senders;
    }

    private JavaMailSenderImpl createSender(String host, int port, String username, String password) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username.trim());
        sender.setPassword(password);
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        props.put("mail.smtp.ssl.trust", host);
        if (port == 465) {
            props.put("mail.smtp.ssl.enable", "true");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }

        return sender;
    }

    private String buildOtpHtml(String otpCode, long minutes, String purpose) {
        String title = "Mã OTP xác minh đăng ký";
        String intro = "Chúng tôi đã nhận được yêu cầu xác minh email cho tài khoản ViVuGo của bạn.";
        if ("RESET_PASSWORD".equals(purpose)) {
            title = "Mã OTP đặt lại mật khẩu";
            intro = "Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản ViVuGo của bạn.";
        }

        return """
                <!doctype html>
                <html lang="vi">
                  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                    <div style="width:100%;padding:24px 12px;box-sizing:border-box;">
                      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                        <div style="background:linear-gradient(90deg,#0f766e,#059669);padding:16px 20px;color:#ffffff;font-weight:700;">ViVuGo - Thong bao he thong</div>
                        <div style="padding:22px 20px 18px 20px;">
                          <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.35;">{{TITLE}}</h1>
                          <p style="margin:0 0 12px 0;line-height:1.55;font-size:14px;">{{INTRO}}</p>
                          <p style="margin:0 0 8px 0;color:#475569;font-size:13px;">Mã OTP có hiệu lực {{MINUTES}} phút:</p>
                          <div style="font-size:26px;font-weight:800;letter-spacing:6px;color:#0f766e;text-align:center;padding:14px 12px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;">{{OTP}}</div>
                          <p style="margin:12px 0 0 0;color:#475569;font-size:13px;">Nếu bạn không yêu cầu mã OTP, vui lòng bỏ qua email này.</p>
                        </div>
                      </div>
                    </div>
                  </body>
                </html>
                """
                .replace("{{TITLE}}", escapeHtml(title))
                .replace("{{INTRO}}", escapeHtml(intro))
                .replace("{{MINUTES}}", Long.toString(minutes))
                .replace("{{OTP}}", escapeHtml(otpCode));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }

    private int parsePort(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 587;
        }
    }

    private String publicSiteUrl() {
        return firstNonBlank(
                environment.getProperty("VITE_CLIENT_URL"),
                environment.getProperty("CLIENT_URL"),
                environment.getProperty("APP_FRONTEND_URL"),
                "https://vivugo-client.vercel.app"
        ).replaceAll("/+$", "");
    }

    private String escapeHtml(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#039;");
    }

    private boolean sendViaHttpProvider(String toEmail, String subject, String text, String html) {
        RuntimeException lastHttpProviderError = null;

        String resendApiKey = environment.getProperty("RESEND_API_KEY");
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            try {
                sendResendEmail(resendApiKey, toEmail, subject, text, html);
                return true;
            } catch (RuntimeException e) {
                lastHttpProviderError = e;
                System.err.println("Resend email provider failed, trying next mail provider: " + e.getMessage());
            }
        }

        if (hasGmailApiProvider()) {
            try {
                sendGmailApiEmail(toEmail, subject, text, html);
                return true;
            } catch (RuntimeException e) {
                lastHttpProviderError = e;
                System.err.println("Gmail API email provider failed, trying next mail provider: " + e.getMessage());
            }
        }

        String brevoApiKey = firstNonBlank(
                environment.getProperty("BREVO_API_KEY"),
                environment.getProperty("SENDINBLUE_API_KEY")
        );
        if (brevoApiKey != null) {
            try {
                sendBrevoEmail(brevoApiKey, toEmail, subject, text, html);
                return true;
            } catch (RuntimeException e) {
                lastHttpProviderError = e;
                System.err.println("Brevo email provider failed, trying next mail provider: " + e.getMessage());
            }
        }

        if (lastHttpProviderError != null) {
            throw lastHttpProviderError;
        }

        return false;
    }

    private boolean hasHttpMailProvider() {
        return hasGmailApiProvider()
                || firstNonBlank(
                environment.getProperty("BREVO_API_KEY"),
                environment.getProperty("SENDINBLUE_API_KEY"),
                environment.getProperty("RESEND_API_KEY")
        ) != null;
    }

    private boolean hasGmailApiProvider() {
        return firstNonBlank(
                environment.getProperty("GOOGLE_CLIENT_ID"),
                environment.getProperty("GMAIL_CLIENT_ID")
        ) != null
                && firstNonBlank(
                environment.getProperty("GOOGLE_CLIENT_SECRET"),
                environment.getProperty("GMAIL_CLIENT_SECRET")
        ) != null
                && firstNonBlank(
                environment.getProperty("GOOGLE_REFRESH_TOKEN"),
                environment.getProperty("GMAIL_REFRESH_TOKEN")
        ) != null;
    }

    private void sendGmailApiEmail(String toEmail, String subject, String text, String html) {
        String accessToken = fetchGmailAccessToken();
        String rawMessage = buildGmailRawMessage(toEmail, subject, text, html);
        String body = "{\"raw\":\"" + rawMessage + "\"}";
        postEmailJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                body,
                "Authorization",
                "Bearer " + accessToken);
    }

    private String fetchGmailAccessToken() {
        String clientId = firstNonBlank(
                environment.getProperty("GOOGLE_CLIENT_ID"),
                environment.getProperty("GMAIL_CLIENT_ID")
        );
        String clientSecret = firstNonBlank(
                environment.getProperty("GOOGLE_CLIENT_SECRET"),
                environment.getProperty("GMAIL_CLIENT_SECRET")
        );
        String refreshToken = firstNonBlank(
                environment.getProperty("GOOGLE_REFRESH_TOKEN"),
                environment.getProperty("GMAIL_REFRESH_TOKEN")
        );

        String body = "client_id=" + urlEncode(clientId)
                + "&client_secret=" + urlEncode(clientSecret)
                + "&refresh_token=" + urlEncode(refreshToken)
                + "&grant_type=refresh_token";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Gmail token API returned HTTP " + response.statusCode() + ": " + response.body());
            }

            String accessToken = extractJsonString(response.body(), "access_token");
            if (accessToken == null || accessToken.isBlank()) {
                throw new IllegalStateException("Gmail token API response did not include access_token.");
            }
            return accessToken;
        } catch (Exception e) {
            throw new IllegalStateException("Gmail token request failed: " + e.getMessage(), e);
        }
    }

    private String buildGmailRawMessage(String toEmail, String subject, String text, String html) {
        try {
            MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
            message.setFrom(new InternetAddress(fromEmail(), fromName(), "UTF-8"));
            message.setRecipients(MimeMessage.RecipientType.TO, InternetAddress.parse(toEmail));
            message.setSubject(subject, "UTF-8");
            message.setContent(html != null ? html : text.replace("\n", "<br/>"), "text/html; charset=UTF-8");

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            message.writeTo(outputStream);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(outputStream.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("Gmail MIME build failed: " + e.getMessage(), e);
        }
    }

    private void sendBrevoEmail(String apiKey, String toEmail, String subject, String text, String html) {
        String body = "{"
                + "\"sender\":{\"name\":\"" + json(fromName()) + "\",\"email\":\"" + json(fromEmail()) + "\"},"
                + "\"to\":[{\"email\":\"" + json(toEmail) + "\"}],"
                + "\"subject\":\"" + json(subject) + "\","
                + "\"textContent\":\"" + json(text) + "\","
                + "\"htmlContent\":\"" + json(html != null ? html : text.replace("\n", "<br/>")) + "\""
                + "}";
        postEmailJson("https://api.brevo.com/v3/smtp/email", body, "api-key", apiKey);
    }

    private void sendResendEmail(String apiKey, String toEmail, String subject, String text, String html) {
        String from = firstNonBlank(
                environment.getProperty("RESEND_FROM"),
                fromName() + " <" + fromEmail() + ">"
        );
        String body = "{"
                + "\"from\":\"" + json(from) + "\","
                + "\"to\":[\"" + json(toEmail) + "\"],"
                + "\"subject\":\"" + json(subject) + "\","
                + "\"text\":\"" + json(text) + "\","
                + "\"html\":\"" + json(html != null ? html : text.replace("\n", "<br/>")) + "\""
                + "}";
        postEmailJson("https://api.resend.com/emails", body, "Authorization", "Bearer " + apiKey);
    }

    private void postEmailJson(String url, String body, String authHeader, String authValue) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "ViVuGo Backend")
                    .header(authHeader, authValue)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Email API returned HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Email API send failed: " + e.getMessage(), e);
        }
    }

    private String fromEmail() {
        return firstNonBlank(
                environment.getProperty("MAIL_FROM_EMAIL"),
                environment.getProperty("BREVO_FROM_EMAIL"),
                environment.getProperty("RESEND_FROM_EMAIL"),
                environment.getProperty("MAIL_USERNAME"),
                environment.getProperty("EMAIL_USER"),
                environment.getProperty("SPRING_MAIL_USERNAME")
        );
    }

    private String fromName() {
        return firstNonBlank(environment.getProperty("MAIL_FROM_NAME"), SENDER_DISPLAY_NAME);
    }

    private String json(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String extractJsonString(String json, String key) {
        if (json == null || key == null) {
            return null;
        }

        String pattern = "\"" + key + "\"";
        int keyIndex = json.indexOf(pattern);
        if (keyIndex < 0) {
            return null;
        }

        int colonIndex = json.indexOf(':', keyIndex + pattern.length());
        if (colonIndex < 0) {
            return null;
        }

        int valueStart = json.indexOf('"', colonIndex + 1);
        if (valueStart < 0) {
            return null;
        }

        StringBuilder value = new StringBuilder();
        boolean escaped = false;
        for (int i = valueStart + 1; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (escaped) {
                value.append(ch);
                escaped = false;
            } else if (ch == '\\') {
                escaped = true;
            } else if (ch == '"') {
                return value.toString();
            } else {
                value.append(ch);
            }
        }

        return null;
    }

    private String mailFailureMessage(Exception e) {
        String message = e == null ? "" : e.getMessage();
        if (message != null && message.contains("Couldn't connect to host")) {
            return "SMTP outbound is blocked by the hosting provider. Configure BREVO_API_KEY or RESEND_API_KEY to send email via HTTPS API.";
        }
        return message;
    }

    @Async
    public void sendPaymentSuccessEmail(PaymentSuccessEmailData data) {
        try {
            // Format tiền tệ
            NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
            String formattedAmount = currencyFormatter.format(data.getFinalAmount());

            String policyUrl = publicSiteUrl() + "/refund-policy";

            // Template HTML
            String htmlTemplate = """
                <h3>Xin chào %s,</h3>
                <p>ViVuGo xin thông báo giao dịch thanh toán của bạn đã được xác nhận <b>THÀNH CÔNG</b>.</p>
                <div style='background-color: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;'>
                    <h4>📦 Thông tin đơn hàng:</h4>
                    <ul>
                        <li><b>Mã đơn hàng:</b> %s</li>
                        <li><b>Tour du lịch:</b> %s</li>
                        <li><b>Ngày khởi hành:</b> %s</li>
                        <li><b>Số lượng:</b> %d Người lớn, %d Trẻ em</li>
                        <li><b>Tổng thanh toán:</b> <span style='color: #0284c7; font-weight: bold;'>%s</span></li>
                    </ul>
                </div>
                <p>Cảm ơn bạn đã tin tưởng và lựa chọn ViVuGo. Chúc bạn có một chuyến đi thật vui, an toàn và nhiều kỷ niệm đẹp.</p>
                <p style='font-size: 13px; color: #64748b;'>Lưu ý nhỏ: nếu cần thay đổi kế hoạch, bạn có thể xem chính sách hủy và hoàn tiền tại
                    <a href='%s' style='color:#2563eb;'>%s</a>.
                </p>
                <p>Trân trọng,<br/>Đội ngũ ViVuGo</p>
                """;

            // Fill dữ liệu vào template
            String htmlContent = String.format(htmlTemplate,
                    data.getCustomerName(),
                    data.getBookingId(),
                    data.getTourTitle(),
                    data.getStartDate(),
                    data.getNumAdults(),
                    data.getNumChildren(),
                    formattedAmount,
                    policyUrl,
                    policyUrl
            );

            if (sendViaHttpProvider(
                    data.getToEmail(),
                    String.format("Xác nhận thanh toán thành công - Mã đơn: %s", data.getBookingId()),
                    "",
                    htmlContent
            )) {
                System.out.println("Payment success email sent via HTTP provider to: " + data.getToEmail());
                return;
            }

            JavaMailSenderImpl sender = gmailSenders().get(0);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(sender.getUsername(), SENDER_DISPLAY_NAME);
            helper.setTo(data.getToEmail());
            helper.setSubject(String.format("Xác nhận thanh toán thành công - Mã đơn: %s", data.getBookingId()));
            helper.setText(htmlContent, true); // true để bật chế độ HTML

            sender.send(message);
            System.out.println("Payment success email sent to: " + data.getToEmail());

        } catch (Exception e) {
            System.err.println("Failed to send payment email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Email xác nhận hủy booking (admin duyệt hủy)
    @Async
    public void sendBookingCanceledEmail(BookingCanceledEmailData data) {
        try {
            NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
            String formattedAmount = currencyFormatter.format(
                    data.getFinalAmount() != null ? data.getFinalAmount() : 0.0
            );

            String htmlTemplate = """
                <h3>Xin chào %s,</h3>
                <p>ViVuGo xin thông báo yêu cầu hủy booking của bạn đã được <b>DUYỆT THÀNH CÔNG</b>.</p>
                <div style='background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;'>
                    <h4>Thông tin booking:</h4>
                    <ul>
                        <li><b>Mã booking:</b> %s</li>
                        <li><b>Tour du lịch:</b> %s</li>
                        <li><b>Ngày khởi hành dự kiến:</b> %s</li>
                        <li><b>Số lượng:</b> %d Người lớn, %d Trẻ em</li>
                        <li><b>Số tiền đơn hàng:</b> <span style='color: #b91c1c; font-weight: bold;'>%s</span></li>
                    </ul>
                </div>
                <p>Nếu bạn đã thanh toán trước đó, các bước hoàn tiền (nếu có) sẽ được bộ phận kế toán xử lý theo chính sách của ViVuGo.</p>
                <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ bộ phận hỗ trợ của chúng tôi.</p>
                <p>Trân trọng,<br/>Đội ngũ ViVuGo</p>
                """;

            String htmlContent = String.format(
                    htmlTemplate,
                    data.getCustomerName(),
                    data.getBookingId(),
                    data.getTourTitle(),
                    data.getStartDate(),       // có thể format lại nếu muốn "dd/MM/yyyy"
                    data.getNumAdults(),
                    data.getNumChildren(),
                    formattedAmount
            );

            if (sendViaHttpProvider(
                    data.getToEmail(),
                    String.format("Xác nhận hủy đơn đặt tour - Mã đơn: %s", data.getBookingId()),
                    "",
                    htmlContent
            )) {
                System.out.println("Booking canceled email sent via HTTP provider to: " + data.getToEmail());
                return;
            }

            JavaMailSenderImpl sender = gmailSenders().get(0);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(sender.getUsername(), SENDER_DISPLAY_NAME);
            helper.setTo(data.getToEmail());
            helper.setSubject(String.format(
                    "Xác nhận hủy đơn đặt tour - Mã đơn: %s",
                    data.getBookingId()
            ));
            helper.setText(htmlContent, true);
            sender.send(message);
            System.out.println("Booking canceled email sent to: " + data.getToEmail());

        } catch (Exception e) {
            System.err.println("Failed to send booking canceled email: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
