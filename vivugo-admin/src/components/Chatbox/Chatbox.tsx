import http from "../../utils/http";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { resolveAssetUrl } from "../../utils/utils";

// Kiểu dữ liệu nhận về từ Backend
interface MiniTour {
    tourID: string;
    title: string;
    imageURL: string;
    finalPrice: number;
}

interface Message {
    role: "user" | "bot";
    content: string;
    suggestedTours?: MiniTour[];
}

export default function Chatbox() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            content: "Xin chào! Mình là ViVuGo AI. Bạn muốn đi du lịch ở đâu nào?",
        },
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Tự cuộn xuống tin nhắn mới
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const chatMutation = useMutation({
        mutationFn: async (msg: string) => {
            const chatHistory = messages.map((m) => ({
                role: m.role === "bot" ? "assistant" : "user",
                content: m.content || "",
            }));
            chatHistory.push({ role: "user", content: msg });

            const res = await http.post("ai/chat", { messages: chatHistory }, { timeout: 35000 });
            return res.data;
        },
        onSuccess: (data) => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    content: data?.reply || "Đây là kết quả mình tìm được:",
                    suggestedTours: data?.tours || []
                }
            ]);
        },
        onError: () => {
            setMessages((prev) => [
                ...prev,
                { role: "bot", content: "Xin lỗi, AI đang bận. Vui lòng thử lại sau." },
            ]);
        },
    });

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages((prev) => [...prev, { role: "user", content: input }]);
        setInput("");
        chatMutation.mutate(input);
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 font-sans">
            {/* Nút bật tắt chat */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all flex items-center justify-center"
                    >
                        <MessageCircle size={28} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Cửa sổ Chat */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="bg-white w-[380px] h-[580px] rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 flex justify-between items-center text-white shadow-md z-10 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="bg-white/20 p-1.5 rounded-full"><Bot size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-sm">ViVuGo AI</h3>
                                    <p className="text-xs text-blue-100 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Online
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
                        </div>

                        {/* Vùng chứa tin nhắn */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                    
                                    {/* Bong bóng chữ */}
                                    <div className={`flex items-end gap-2 max-w-[90%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-sm ${msg.role === "user" ? "bg-gray-500" : "bg-blue-500"}`}>
                                            {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-[14px] shadow-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"}`}>
                                            {msg.content}
                                        </div>
                                    </div>

                                    {/* MẢNG TOUR HIỂN THỊ ĐỂ CLICK (THIẾT KẾ SIÊU NHỎ GỌN) */}
                                    {msg.suggestedTours && msg.suggestedTours.length > 0 && (
                                        <div className="mt-2 ml-10 max-w-[calc(100%-2.5rem)]">
                                            {/* Container cuộn ngang, gap-2 cho khít hơn */}
                                            <div className="flex gap-2.5 overflow-x-auto pb-3 snap-x hide-scrollbar">
                                                {msg.suggestedTours.map((tour, index) => {
                                                    if (!tour) return null;
                                                    const safeId = tour.tourID || (tour as any).tourId || (tour as any).id;
                                                    const price = tour.finalPrice ? tour.finalPrice.toLocaleString('vi-VN') + 'đ' : 'Liên hệ';
                                                    const img = resolveAssetUrl(tour.imageURL, 'https://placehold.co/400x256?text=Tour');

                                                    return (
                                                        <Link 
                                                            to={`/tours/${safeId}`} 
                                                            key={index} 
                                                            
                                                            className="w-34 flex-shrink-0 snap-start bg-white rounded-[10px] overflow-hidden border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all shadow-sm group block"
                                                        >
                                                            {/* Khung ảnh chiều cao h-20 (~80px) */}
                                                            <div className="h-15 w-full bg-gray-100 overflow-hidden relative">
                                                                <img 
                                                                    src={img} 
                                                                    alt={tour.title} 
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                            </div>
                                                            {/* Nội dung Card cực nhỏ gọn */}
                                                            <div className="p-2">
                                                                <h4 className="text-[10px] font-semibold text-gray-800 line-clamp-2 min-h-[20px] mb-1 leading-[1.2]">
                                                                    {tour.title}
                                                                </h4>
                                                                <span className="text-[10px] font-bold text-blue-600 block">
                                                                    {price}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {/* Loading State */}
                            {chatMutation.isPending && (
                                <div className="flex justify-start ml-10">
                                    <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 shadow-sm">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Nhập */}
                        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="Hỏi AI về tour (VD: Đà Lạt)..."
                                    className="w-full pl-4 pr-12 py-3.5 bg-gray-100 rounded-full border-none focus:ring-2 focus:ring-blue-500 outline-none text-[14px] transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || chatMutation.isPending}
                                    className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
