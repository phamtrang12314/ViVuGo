import http from '../../utils/http'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, User, PhoneCall, MessageSquareText } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { resolveAssetUrl } from '../../utils/utils'
import { getVivugoSessionId } from '../../utils/aiSession'
import { AppContext } from '../../contexts/app.context'
import { getProfile } from '../../apis/auth.api'
import { contactApi } from '../../apis/contact.api'

interface MiniTour {
  tourID: string
  title: string
  imageURL: string
  finalPrice: number
}

interface AiMessage {
  role: 'user' | 'bot'
  content: string
  suggestedTours?: MiniTour[]
}

const SUPPORT_CONVERSATION_KEY = 'vivugo_support_conversation_id'
const SUPPORT_NAME_KEY = 'vivugo_support_name'
const SUPPORT_EMAIL_KEY = 'vivugo_support_email'
const SUPPORT_PHONE_KEY = 'vivugo_support_phone'

const buildAvatarUrl = (nameOrEmail?: string) => {
  const name = nameOrEmail?.trim() || 'Khách hàng'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=64748b&color=fff&size=128&bold=true`
}

export default function Chatbox() {
  const { isAuthenticated, profile } = useContext(AppContext)
  const [isOpen, setIsOpen] = useState(false)
  const [chatMode, setChatMode] = useState<'ai' | 'support'>('ai')
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'bot',
      content: 'Xin chào! Mình là ViVuGo AI. Bạn muốn tìm tour theo vùng miền, ngân sách hay cần hỗ trợ đặt tour?'
    }
  ])
  const [input, setInput] = useState('')
  const [supportInput, setSupportInput] = useState('')
  const [supportName, setSupportName] = useState(localStorage.getItem(SUPPORT_NAME_KEY) || '')
  const [supportEmail, setSupportEmail] = useState(localStorage.getItem(SUPPORT_EMAIL_KEY) || '')
  const [supportPhone, setSupportPhone] = useState(localStorage.getItem(SUPPORT_PHONE_KEY) || '')
  const [supportConversationId, setSupportConversationId] = useState(localStorage.getItem(SUPPORT_CONVERSATION_KEY) || '')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: userData } = useQuery({
    queryKey: ['chatbox-profile'],
    queryFn: () => getProfile().then((res) => res.data),
    enabled: isAuthenticated,
    staleTime: 300000
  })

  const userAvatar = resolveAssetUrl(
    userData?.avatarURL,
    buildAvatarUrl(userData?.name || profile?.email)
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen, chatMode])

  const chatMutation = useMutation({
    mutationFn: async (msg: string) => {
      const chatHistory = messages.map((item) => ({
        role: item.role === 'bot' ? 'assistant' : 'user',
        content: item.content || ''
      }))
      chatHistory.push({ role: 'user', content: msg })

      const res = await http.post(
        'ai/chat',
        { messages: chatHistory, sessionId: getVivugoSessionId() },
        { timeout: 12000 }
      )
      return res.data
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: data?.reply || 'Mình đã phân tích yêu cầu của bạn. Bạn xem các gợi ý bên dưới nhé.',
          suggestedTours: data?.tours || []
        }
      ])
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Xin lỗi, ViVuGo AI đang phản hồi chậm. Bạn thử gửi lại câu hỏi nhé.' }
      ])
    }
  })

  const { data: supportMessages = [], refetch: refetchSupportMessages } = useQuery({
    queryKey: ['support-messages', supportConversationId],
    queryFn: () => contactApi.getSupportMessages(supportConversationId).then((res) => res.data),
    enabled: Boolean(isAuthenticated && supportConversationId && chatMode === 'support' && isOpen),
    refetchInterval: 5000
  })

  const startSupportMutation = useMutation({
    mutationFn: async (firstMessage: string) => {
      return contactApi.startSupportChat({
        conversationId: supportConversationId || undefined,
        name: supportName || userData?.name || 'Khách hàng',
        email: supportEmail || userData?.email || profile?.email || '',
        phone: supportPhone || userData?.phoneNumber || '',
        message: firstMessage
      }).then((res) => res.data)
    },
    onSuccess: async (conversation) => {
      if (!conversation.conversationId) return
      setSupportConversationId(conversation.conversationId)
      localStorage.setItem(SUPPORT_CONVERSATION_KEY, conversation.conversationId)
      localStorage.setItem(SUPPORT_NAME_KEY, supportName)
      localStorage.setItem(SUPPORT_EMAIL_KEY, supportEmail || userData?.email || profile?.email || '')
      localStorage.setItem(SUPPORT_PHONE_KEY, supportPhone)
      setSupportInput('')
      await refetchSupportMessages()
    }
  })

  const sendSupportMutation = useMutation({
    mutationFn: async (text: string) => {
      return contactApi.sendSupportMessage(supportConversationId, text).then((res) => res.data)
    },
    onSuccess: async () => {
      setSupportInput('')
      await refetchSupportMessages()
    }
  })

  const handleSend = () => {
    const trimmedInput = input.trim()
    if (!trimmedInput) return
    setMessages((prev) => [...prev, { role: 'user', content: trimmedInput }])
    setInput('')
    chatMutation.mutate(trimmedInput)
  }

  const supportCanStart = useMemo(() => {
    if (!isAuthenticated) return false
    const email = (supportEmail || userData?.email || profile?.email || '').trim()
    return email.length > 0
  }, [isAuthenticated, supportEmail, userData?.email, profile?.email])

  const handleSendSupport = () => {
    if (!isAuthenticated) return
    const text = supportInput.trim()
    if (!text) return

    if (!supportConversationId) {
      if (!supportCanStart) return
      startSupportMutation.mutate(text)
      return
    }

    sendSupportMutation.mutate(text)
  }

  return (
    <div className='fixed bottom-28 right-4 z-50 font-sans md:bottom-24 md:right-6'>
      <div className='mb-3 flex flex-col items-end gap-2'>
        <a
          href='https://zalo.me/0989471415'
          target='_blank'
          rel='noreferrer'
          className='inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-full bg-blue-500 px-4 text-sm font-semibold text-white shadow-lg hover:bg-blue-600'
        >
          <MessageSquareText size={16} className='shrink-0' />
          <span>Zalo</span>
        </a>
        <a
          href='tel:0989471415'
          className='inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700'
        >
          <PhoneCall size={16} className='shrink-0' />
          <span>Hotline</span>
        </a>
      </div>

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => {
              setChatMode('ai')
              setIsOpen(true)
            }}
            className='inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700'
            aria-label='Mo chat ho tro'
          >
            <MessageCircle size={16} className='shrink-0' />
            <span>Chat AI/Admin</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className='flex h-[620px] w-[390px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl'
          >
            <div className='z-10 flex shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white shadow-md'>
              <div className='flex items-center gap-2'>
                <div className='rounded-full bg-white/20 p-1.5'><Bot size={20} /></div>
                <div>
                  <h3 className='text-sm font-bold'>ViVuGo hỗ trợ</h3>
                  <p className='flex items-center gap-1 text-xs text-blue-100'>
                    <span className='h-2 w-2 rounded-full bg-green-400' />
                    Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className='rounded-full p-1 hover:bg-white/20' aria-label='Dong chat'>
                <X size={20} />
              </button>
            </div>

            <div className='grid grid-cols-2 border-b border-gray-200 text-sm'>
              <button
                onClick={() => setChatMode('ai')}
                className={`px-3 py-2 font-semibold ${chatMode === 'ai' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
              >
                Chat với AI
              </button>
              <button
                onClick={() => setChatMode('support')}
                className={`px-3 py-2 font-semibold ${chatMode === 'support' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
              >
                Chat với Admin
              </button>
            </div>

            {chatMode === 'ai' ? (
              <>
                <div ref={scrollRef} className='flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 scroll-smooth'>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`flex max-w-[90%] items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`h-8 w-8 flex-shrink-0 overflow-hidden rounded-full shadow-sm ${msg.role === 'user' ? 'bg-gray-500' : 'bg-blue-500'}`}>
                          {msg.role === 'user' ? (
                            isAuthenticated ? (
                              <img src={userAvatar} alt='Avatar khách hàng' className='h-full w-full object-cover' />
                            ) : (
                              <div className='flex h-full w-full items-center justify-center text-white'><User size={16} /></div>
                            )
                          ) : (
                            <div className='flex h-full w-full items-center justify-center text-white'><Bot size={16} /></div>
                          )}
                        </div>
                        <div className={`whitespace-pre-wrap rounded-2xl p-3 text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'rounded-br-none bg-blue-600 text-white' : 'rounded-bl-none border border-gray-200 bg-white text-gray-800'}`}>
                          {msg.content}
                        </div>
                      </div>

                      {msg.suggestedTours && msg.suggestedTours.length > 0 && (
                        <div className='ml-10 mt-2 max-w-[calc(100%-2.5rem)]'>
                          <div className='hide-scrollbar flex snap-x gap-2.5 overflow-x-auto pb-3'>
                            {msg.suggestedTours.map((tour, index) => {
                              if (!tour) return null
                              const safeId = tour.tourID || (tour as any).tourId || (tour as any).id
                              const price = tour.finalPrice ? `${tour.finalPrice.toLocaleString('vi-VN')}đ` : 'Liên hệ'
                              const img = resolveAssetUrl(tour.imageURL, 'https://placehold.co/400x256?text=Tour')

                              return (
                                <Link
                                  to={`/tours/${safeId}`}
                                  key={`${safeId}-${index}`}
                                  className='block w-36 flex-shrink-0 snap-start overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-500 hover:shadow-md'
                                >
                                  <div className='relative h-16 w-full overflow-hidden bg-gray-100'>
                                    <img src={img} alt={tour.title} className='h-full w-full object-cover transition-transform duration-500 hover:scale-105' />
                                  </div>
                                  <div className='p-2'>
                                    <h4 className='mb-1 min-h-[28px] line-clamp-2 text-[11px] font-semibold leading-[1.25] text-gray-800'>
                                      {tour.title}
                                    </h4>
                                    <span className='block text-[11px] font-bold text-blue-600'>{price}</span>
                                  </div>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {chatMutation.isPending && (
                    <div className='ml-10 flex justify-start'>
                      <div className='rounded-2xl rounded-bl-none border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm'>
                        Đang phân tích yêu cầu...
                      </div>
                    </div>
                  )}
                </div>

                <div className='shrink-0 border-t border-gray-100 bg-white p-3'>
                  <div className='relative flex items-center'>
                    <input
                      type='text'
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                      placeholder='Hỏi AI về tour, giá, đặt tour...'
                      className='w-full rounded-full border-none bg-gray-100 py-3.5 pl-4 pr-12 text-[14px] outline-none transition-all focus:ring-2 focus:ring-blue-500'
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || chatMutation.isPending}
                      className='absolute right-2 rounded-full bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300'
                      aria-label='Gui tin nhan'
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className='flex-1 overflow-y-auto bg-gray-50 p-4'>
                  {!isAuthenticated && (
                    <div className='mb-4 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600'>
                      <p className='font-semibold text-gray-800'>Bạn cần đăng nhập để chat với Admin.</p>
                      <p className='mt-1'>Khi chưa đăng nhập bạn vẫn chat được với AI bình thường.</p>
                      <Link
                        to='/login'
                        className='mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700'
                      >
                        Đăng nhập ngay
                      </Link>
                    </div>
                  )}
                  {!supportConversationId && (
                    <div className='mb-4 rounded-xl border border-gray-200 bg-white p-3'>
                      <p className='mb-2 text-xs font-semibold text-gray-700'>Nhập thông tin để chat với admin</p>
                      <div className='space-y-2'>
                        <input
                          value={supportName}
                          onChange={(event) => setSupportName(event.target.value)}
                          disabled={!isAuthenticated}
                          placeholder='Họ tên'
                          className='h-9 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400'
                        />
                        <input
                          value={supportEmail}
                          onChange={(event) => setSupportEmail(event.target.value)}
                          disabled={!isAuthenticated}
                          placeholder='Email'
                          className='h-9 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400'
                        />
                        <input
                          value={supportPhone}
                          onChange={(event) => setSupportPhone(event.target.value)}
                          disabled={!isAuthenticated}
                          placeholder='Số điện thoại'
                          className='h-9 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400'
                        />
                      </div>
                    </div>
                  )}

                  {supportMessages.length === 0 ? (
                    <div className='rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500'>
                      Chưa có tin nhắn. Bạn có thể gửi yêu cầu để admin tư vấn chi tiết.
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {supportMessages.map((item) => (
                        <div key={item.messageId} className={`flex ${item.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                              item.senderType === 'CUSTOMER'
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-200 bg-white text-gray-800'
                            }`}
                          >
                            <p className='text-xs font-semibold opacity-80'>{item.senderName}</p>
                            <p className='mt-1 whitespace-pre-wrap'>{item.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='shrink-0 border-t border-gray-100 bg-white p-3'>
                  <div className='relative flex items-center gap-2'>
                    <input
                      type='text'
                      value={supportInput}
                      onChange={(event) => setSupportInput(event.target.value)}
                      disabled={!isAuthenticated}
                      onKeyDown={(event) => event.key === 'Enter' && handleSendSupport()}
                      placeholder='Nhắn cho admin...'
                      className='h-11 w-full rounded-full border-none bg-gray-100 px-4 text-[14px] outline-none focus:ring-2 focus:ring-blue-500'
                    />
                    <button
                      onClick={handleSendSupport}
                      disabled={
                        !supportInput.trim()
                        || startSupportMutation.isPending
                        || sendSupportMutation.isPending
                        || (!supportConversationId && !supportCanStart)
                        || !isAuthenticated
                      }
                      className='rounded-full bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300'
                      aria-label='Gui tin nhan ho tro'
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  {!isAuthenticated && (
                    <p className='mt-2 text-xs text-red-500'>Bạn cần đăng nhập để chat với admin.</p>
                  )}
                  {isAuthenticated && !supportConversationId && !supportCanStart && (
                    <p className='mt-2 text-xs text-red-500'>Vui lòng nhập email để admin có thể phản hồi.</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



