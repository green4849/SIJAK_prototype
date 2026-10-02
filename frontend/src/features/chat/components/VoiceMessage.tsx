import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '@/shared/lib/datetime'
import { chatApi } from '../api/chatApi'
import styles from './VoiceMessage.module.css'
import { ICON, ICON_STROKE } from '@/shared/ui/icon'

interface Props {
  audioUrl: string
  durationSec: number
}

/** 음성 메시지 — 큰 재생 버튼 하나. 처음 누를 때 내려받는다. */
export function VoiceMessage({ audioUrl, durationSec }: Props) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const objectUrl = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(
    () => () => {
      audio.current?.pause()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )

  async function toggle() {
    if (playing) {
      audio.current?.pause()
      return
    }
    setFailed(false)
    try {
      if (!audio.current) {
        setLoading(true)
        objectUrl.current = URL.createObjectURL(await chatApi.voice(audioUrl))
        const el = new Audio(objectUrl.current)
        el.onplay = () => setPlaying(true)
        el.onpause = () => setPlaying(false)
        el.onended = () => setPlaying(false)
        audio.current = el
      }
      await audio.current.play()
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" className={styles.voice} onClick={toggle} aria-pressed={playing}>
      <span className={styles.icon} aria-hidden="true">
        {playing ? <Pause size={ICON.md} strokeWidth={ICON_STROKE} /> : <Play size={ICON.md} strokeWidth={ICON_STROKE} />}
      </span>
      <span>
        {failed ? '재생하지 못했어요' : loading ? '불러오는 중…' : playing ? '듣는 중' : '음성 듣기'}
        <span className={styles.len}> · {formatDuration(durationSec)}</span>
      </span>
    </button>
  )
}
