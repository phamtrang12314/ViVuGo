import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Copy, CreditCard, History, Home, Loader2, TimerReset } from 'lucide-react'
import { bookingApi } from '../../apis/booking.api'
import { formatCurrency } from '../../utils/utils'
import { subscribeBookingRealtime } from '../../utils/realtime'
import Button from '../../components/Button'

const PAYMENT_TIMEOUT_MINUTES = 30

export default function PaymentScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  const { data: bookingData, isLoading, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getBookingById(id as string),
    enabled: !!id && !isExpired,
    refetchInterval: (query) => {
      const booking = query.state.data?.data
      if (!booking || booking.status === 'CANCELED' || booking.status === 'CONFIRMED' || booking.paymentStatus === 'SUCCESS' || isExpired) {
        return false
      }
      return 3000
    }
  })

  const booking = bookingData?.data
  const isPaid = booking?.status === 'CONFIRMED' || booking?.paymentStatus === 'SUCCESS'

  useEffect(() => {
    if (!id) return undefined
    return subscribeBookingRealtime((event) => {
      if (event.bookingId === id && (event.type === 'PAYMENT_CONFIRMED' || event.type === 'BOOKING_STATUS_CHANGED')) {
        refetch()
      }
    })
  }, [id, refetch])

  useEffect(() => {
    if (!booking || isPaid) return

    const initialSeconds = Math.max(0, booking.paymentTimeoutSeconds ?? PAYMENT_TIMEOUT_MINUTES * 60)
    const expireTime = Date.now() + initialSeconds * 1000
    setTimeLeft(initialSeconds)
    setIsExpired(initialSeconds <= 0)

    const interval = window.setInterval(() => {
      const now = Date.now()
      const distance = Math.floor((expireTime - now) / 1000)

      if (distance <= 0) {
        setTimeLeft(0)
        setIsExpired(true)
        window.clearInterval(interval)
        return
      }

      setTimeLeft(distance)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [booking?.bookingID, booking?.paymentTimeoutSeconds, isPaid])

  const transferContent = booking?.paymentCode || booking?.bookingID.replace(/-/g, '') || ''
  const qrUrl = useMemo(() => {
    if (!booking) return ''
    const bankId = 'MB'
    const accountNo = '0001871842443'
    const template = 'compact2'
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${Math.round(
      booking.finalAmount
    )}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent('ViVuGo')}`
  }, [booking, transferContent])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainSeconds.toString().padStart(2, '0')}`
  }

  const copyText = (value: string) => {
    if (value) navigator.clipboard.writeText(value)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    )
  }

  if (!booking || isExpired || booking.status === 'CANCELED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <TimerReset className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Đơn hàng đã hết hạn thanh toán</h2>
          <p className="mb-6 text-gray-600">
            Thời gian thanh toán đã kết thúc. Bạn có thể quay lại lịch sử đặt tour để kiểm tra trạng thái đơn.
          </p>
          <Button onClick={() => navigate('/account/historyTour')} className="w-full bg-gray-700 hover:bg-gray-800">
            <History className="mr-2" size={18} /> Về lịch sử đặt tour
          </Button>
        </div>
      </div>
    )
  }

  if (isPaid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Thanh toán thành công</h2>
          <p className="mb-6 text-gray-600">
            Cảm ơn bạn đã đặt tour. Mã đơn hàng <b>{booking.bookingID}</b> đã được ghi nhận là đã thanh toán.
          </p>
          <div className="grid gap-3">
            <Button onClick={() => navigate('/account/historyTour')} className="w-full">
              <History className="mr-2" size={18} /> Xem tour đã đặt
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <Home className="mr-2" size={18} /> Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const bankId = 'MB'
  const accountNo = '0001871842443'

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-gray-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={20} className="mr-2" /> Quay về trang chủ
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center text-xl font-bold text-gray-800">
                <CreditCard className="mr-2 text-blue-600" />
                Thông tin thanh toán
              </h2>

              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <p className="mb-1 font-medium text-red-700">Vui lòng thanh toán trong vòng</p>
                <div className="text-4xl font-bold text-red-600">{formatTime(timeLeft)}</div>
              </div>

              <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-2 flex justify-between gap-4">
                  <span className="text-gray-600">Mã đơn hàng:</span>
                  <span className="text-right font-mono font-bold text-blue-700">{booking.bookingID}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái:</span>
                  <span className="rounded bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-700">
                    Đang chờ thanh toán
                  </span>
                </div>
              </div>

              <h3 className="mb-3 border-b pb-2 font-semibold text-gray-800">Chi tiết dịch vụ</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Tour du lịch</span>
                  <span className="w-2/3 text-right font-medium text-gray-900">{booking.tourName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày đặt</span>
                  <span className="font-medium text-gray-900">
                    {new Date(booking.bookingDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số lượng</span>
                  <span className="font-medium text-gray-900">
                    {booking.numAdults} người lớn, {booking.numChildren} trẻ em
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổng tiền</span>
                  <span className="text-lg font-bold text-blue-700">{formatCurrency(booking.finalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="sticky top-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg">
              <div className="bg-blue-600 p-4 text-center text-white">
                <h3 className="text-lg font-bold">Quét mã QR để thanh toán</h3>
              </div>
              <div className="flex flex-col items-center p-6">
                <div className="mb-4 rounded-lg border bg-white p-2 shadow-inner">
                  <img src={qrUrl} alt="QR thanh toán" className="h-auto w-full max-w-[250px] object-contain" />
                </div>
                <div className="mb-6 text-center">
                  <p className="text-sm text-gray-500">Số tiền thanh toán</p>
                  <p className="text-3xl font-bold text-blue-700">{formatCurrency(booking.finalAmount)}</p>
                </div>
                <div className="w-full space-y-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm">
                  <PaymentRow label="Ngân hàng" value={bankId} />
                  <PaymentRow label="Số tài khoản" value={accountNo} onCopy={() => copyText(accountNo)} />
                  <PaymentRow label="Nội dung CK" value={transferContent} onCopy={() => copyText(transferContent)} highlight />
                </div>
                <div className="mt-6 flex w-full items-center justify-center text-xs text-blue-600">
                  <Loader2 className="mr-1 animate-spin" size={14} /> Đang chờ ngân hàng xác nhận thanh toán...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentRow({
  label,
  value,
  onCopy,
  highlight
}: {
  label: string
  value: string
  onCopy?: () => void
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-gray-500">{label}:</span>
      <div className="flex items-center gap-2 text-right">
        <span className={`font-medium ${highlight ? 'font-bold text-red-600' : 'text-gray-900'}`}>{value}</span>
        {onCopy && <Copy size={14} className="cursor-pointer text-blue-500 hover:text-blue-700" onClick={onCopy} />}
      </div>
    </div>
  )
}
