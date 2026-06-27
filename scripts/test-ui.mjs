/**
 * UI 통합 테스트 — 기술의설명 열 표시 및 정량요건 열 미표시 확인
 * Usage: node scripts/test-ui.mjs
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE = 'http://localhost:3003'

const TEST_INPUT = {
  과제번호: 'P001-TEST',
  과제명: 'LNG 화물창 단열 시스템 개발',
  개발배경: 'LNG 운반선의 화물창 단열 성능 향상을 위한 R&D. 기존 Mark III 방식 대비 열침투율 30% 저감 목표.',
  과제목표: '고성능 단열재 및 화물창 구조체 설계·제조 기술 확보. 극저온(-163℃) 환경에서 장기 내구성 검증.',
  수행방안: '1) 폴리우레탄 발포 단열재 조성 최적화 2) 스테인리스 멤브레인 용접 공정 개발 3) 극저온 사이클 테스트(1000회 이상)',
  기대효과: 'LNG 화물창 단열 기술 국산화. 별표7의2 6.아목(가스화물 저장·운송·적하역 시스템) 해당 기술.',
}

// API 모킹용 응답 — 실제 postProcessResult()가 주입했을 기술의설명 포함
const MOCK_RESULT = {
  과제명: "LNG 화물창 단열 시스템",
  국가전략매핑: [
    {
      매핑항목ID: "국-6-아",
      매핑항목명: "[별표7의2 6.아목] 환경친화적 첨단 선박의 운송ㆍ추진 기술",
      기술의설명: "다음의 어느 하나에 해당하는 시스템의 소재 개발 및 설계ㆍ제조 기술\n1) 가스화물(LNGㆍLPGㆍ에탄ㆍ암모니아ㆍ수소ㆍ이산화탄소를 포함한다)의 저장ㆍ운송ㆍ적하역시스템(화물창, 연료탱크 및 카고핸들링 시스템 등을 포함한다)\n2) 환경친화적 에너지(...)추진ㆍ발전시스템",
      적합도: "상",
      정량요건: "충족",
      판정근거: "LNG 화물창은 별표7의2 6.아목 1)의 가스화물 저장ㆍ운송ㆍ적하역시스템(화물창 포함)에 직접 부합"
    }
  ],
  신성장매핑: [],
  적용공제율: "30%+α (국가전략기술)",
  종합판정: "적합(유력)",
  판단사유: "LNG 화물창 극저온 단열 기술은 별표7의2 6.아목 1)에 명시된 가스화물 저장ㆍ운송 시스템에 해당하므로 국가전략기술(30%)로 판정",
  제목진단: { 오해소지: "없음", 사유: "", 대체제목추천: [] },
  보완사항: [],
  확인필요항목: ["기술심의위원회 사전확인 필요 (시행령 제9조⑮)"],
  _기준메타: { 출처: "별표7의2 (대통령령 제36127호, 2026.4.1.)", 개정일: "2026-04-01" }
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 120 })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })

  // /api/assess 요청 가로채기 — 모킹 응답 반환
  await page.route('**/api/assess', async route => {
    console.log('   [mock] /api/assess 인터셉트 → 모킹 응답 반환')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESULT),
    })
  })

  console.log('1. 메인 페이지 열기...')
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(ROOT, 'scripts', 'ss-01-home.png') })

  console.log('2. 폼 입력...')
  await page.fill('#과제번호', TEST_INPUT.과제번호)
  await page.fill('#과제명',   TEST_INPUT.과제명)
  await page.fill('#개발배경', TEST_INPUT.개발배경)
  await page.fill('#과제목표', TEST_INPUT.과제목표)
  await page.fill('#수행방안', TEST_INPUT.수행방안)
  await page.fill('#기대효과', TEST_INPUT.기대효과)

  await page.screenshot({ path: join(ROOT, 'scripts', 'ss-02-filled.png') })

  console.log('3. 제출 (모킹 응답 사용)...')
  await page.locator('button[type="submit"]').click()

  console.log('4. 결과 대기...')
  try {
    await page.waitForSelector('text=국가전략기술 부합도', { timeout: 10000 })
    console.log('   ✅ 결과 화면 표시됨')
  } catch {
    console.log('   ⚠️  국가전략기술 섹션 미감지')
    await page.screenshot({ path: join(ROOT, 'scripts', 'ss-03-timeout.png'), fullPage: true })
    await browser.close()
    return
  }

  await page.screenshot({ path: join(ROOT, 'scripts', 'ss-03-result-top.png') })

  console.log('5. 매핑 테이블 검증...')
  // 기술의설명 헤더 존재 확인
  const descHeader = await page.locator('th:has-text("기술의설명")').count()
  console.log(`   기술의설명 열 헤더: ${descHeader}개 ${descHeader > 0 ? '✅' : '❌'}`)

  // 정량요건 헤더 없음 확인
  const quantHeader = await page.locator('th:has-text("정량요건")').count()
  console.log(`   정량요건 열 헤더: ${quantHeader}개 ${quantHeader === 0 ? '✅ (없음)' : '❌ (있으면 안 됨)'}`)

  // 기술의설명 셀에 실제 내용 있는지
  const descCells = page.locator('td.whitespace-pre-wrap, td:has-text("시스템"), td:has-text("기술로서"), td:has-text("다음의 어느")')
  const descCount = await descCells.count()
  console.log(`   법령 설명 셀 감지: ${descCount}개 ${descCount > 0 ? '✅' : '⚠️ (API 키 없으면 결과 없음)'}`)

  // 스크롤해서 테이블까지 이동
  await page.locator('text=국가전략기술 부합도').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(ROOT, 'scripts', 'ss-04-mapping-table.png'), fullPage: false })

  // 풀페이지 스크린샷
  await page.screenshot({ path: join(ROOT, 'scripts', 'ss-05-fullpage.png'), fullPage: true })
  console.log('   스크린샷 저장: scripts/ss-*.png')

  console.log('\n=== 테스트 완료 ===')
  await browser.close()
}

run().catch(e => {
  console.error('테스트 오류:', e.message)
  process.exit(1)
})
