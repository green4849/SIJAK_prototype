import type { Contrast, FontScale } from '@/shared/a11y/preferences'
import { useA11yPrefs } from '@/shared/a11y/useA11yPrefs'
import { OptionGrid } from '@/shared/ui/OptionGrid'
import { TopBar } from '@/shared/ui/TopBar'
import styles from './SettingsPage.module.css'

const SCALES = [
  { value: '1', label: '보통' },
  { value: '2', label: '크게' },
  { value: '3', label: '더 크게' },
  { value: '4', label: '아주 크게' },
]

const VIBRATION = [
  { value: 'on', label: '켜기' },
  { value: 'off', label: '끄기' },
]

const GUIDE = [
  { value: 'on', label: '보이기' },
  { value: 'off', label: '숨기기' },
]

const CONTRASTS = [
  { value: 'normal', label: '기본 화면' },
  { value: 'high', label: '선명한 화면' },
]

/** ⑨ → 설정: 글자 크기 4단계 · 고대비 · 진동 · 시작이 버튼 (바꾸는 즉시 적용) */
export function SettingsPage() {
  const { prefs, update } = useA11yPrefs()

  return (
    <section className={styles.page}>
      <TopBar title="화면 설정" backTo="/me" />

      <OptionGrid
        legend="글자 크기"
        options={SCALES}
        selected={[String(prefs.fontScale)]}
        onToggle={(v) => update({ fontScale: Number(v) as FontScale })}
      />

      <OptionGrid
        legend="화면 대비"
        options={CONTRASTS}
        selected={[prefs.contrast]}
        onToggle={(v) => update({ contrast: v as Contrast })}
      />

      <OptionGrid
        legend="진동"
        options={VIBRATION}
        selected={[prefs.vibration ? 'on' : 'off']}
        onToggle={(v) => update({ vibration: v === 'on' })}
      />

      {/* C14 — 구석의 '물어보기' 버튼이 거슬리면 숨긴다. 숨겨도 도움말에서 부를 수 있다 */}
      <OptionGrid
        legend="시작이 버튼"
        hint="숨겨도 도움말에서 시작이에게 물어볼 수 있어요."
        options={GUIDE}
        selected={[prefs.guide ? 'on' : 'off']}
        onToggle={(v) => update({ guide: v === 'on' })}
      />

      <div className={styles.preview} aria-hidden="true">
        <p className={styles.previewTitle}>미리 보기</p>
        <p>이웃과 함께하는 따뜻한 하루, 시작과 함께해요.</p>
      </div>

    </section>
  )
}
