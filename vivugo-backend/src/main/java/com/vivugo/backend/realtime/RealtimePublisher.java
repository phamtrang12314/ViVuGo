package com.vivugo.backend.realtime;

import com.vivugo.backend.model.Booking;
import org.springframework.stereotype.Service;

@Service
public class RealtimePublisher {

    private final RealtimeWebSocketHandler webSocketHandler;

    public RealtimePublisher(RealtimeWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    public void publishBookingEvent(String type, Booking booking) {
        webSocketHandler.broadcast(BookingRealtimeEvent.fromBooking(type, booking));
    }
}
