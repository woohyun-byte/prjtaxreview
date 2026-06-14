// Created: 2026-06-14 09:33:19
/**
 * scripts/inject-descriptions.mjs
 * lib/criteria/별표7의2_전문.txt·별표7_전문.txt에서 항목별 설명문을 추출해
 * annex-catalog.json의 items에 "설명" 필드를 추가합니다.
 *
 * Usage: node scripts/inject-descriptions.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRITERIA = join(__dirname, '..', 'lib', 'criteria')

const catalogPath = join(CRITERIA, 'annex-catalog.json')
const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))

// ── 전문 텍스트 → {id: 설명} 맵 추출 ──────────────────────────────────
function extractDescriptions(text, 별표) {
  const prefix = 별표 === '별표7의2' ? '국' : '신'
  const lines = text.split('\n')

  const fdRe  = /^(\d{1,2})\.\s/    // \S 불필요 — 섹션명이 다음 줄에 있는 경우(예: "14. \n방위산업") 포함
  // 별표7의2: 목은 1~3sp + 한글자 + ". "  / 별표7: 목은 col0 + 한글자 + ". "
  const mokRe = 별표 === '별표7의2'
    ? /^ {1,3}([가-힣])\.\s+(.*)/
    : /^([가-힣])\.\s+(.*)/
  // 별표7의2: 호는 2~5sp + 숫자 + ") "   / 별표7: 호는 0~1sp + 숫자 + ") "
  const hoRe  = 별표 === '별표7의2'
    ? /^ {2,5}(\d+)\)\s*(.*)/
    : /^[ \t]?(\d+)\)\s+(.*)/

  let curF = null, curM = null
  let curMKey = null, curHKey = null

  // 목별 설명 parts (sub-item 포함)
  const mParts = {}  // key → string[]
  // 호별 설명 parts
  const hParts = {}  // key → string[]

  for (const line of lines) {
    // 분야 마커 (숫자. 으로 시작)
    if (fdRe.test(line)) {
      curMKey = null; curHKey = null
      curF = line.match(/^(\d{1,2})/)[1]
      curM = null
      continue
    }

    // 목 마커
    const mokm = line.match(mokRe)
    if (mokm && curF) {
      curHKey = null
      curM = mokm[1]
      curMKey = `${prefix}-${curF}-${curM}`
      const rest = mokm[2] ?? ''                 // "정식명칭: 설명" 또는 "정식명칭"
      const ci = rest.indexOf(': ')
      const desc = ci >= 0 ? rest.slice(ci + 2).trim() : ''
      mParts[curMKey] = desc ? [desc] : []
      continue
    }

    // 호 마커
    const hom = line.match(hoRe)
    if (hom && curF && curM) {
      curHKey = `${prefix}-${curF}-${curM}-${hom[1]}`
      const raw = (hom[2] ?? '').trim()
      const ci = raw.indexOf(': ')
      const desc = ci >= 0 ? raw.slice(ci + 2).trim() : raw  // 콜론 뒤 설명
      hParts[curHKey] = desc ? [desc] : []
      // 부모 목 블록에 하위항목 라인 추가 (sub-item 포함 설명 구성)
      if (curMKey && mParts[curMKey] !== undefined) {
        mParts[curMKey].push(`${hom[1]}) ${raw}`)
      }
      continue
    }

    // 연속행 (HWP 줄바꿈 아티팩트)
    const trimmed = line.trim()
    if (trimmed && curF) {
      if (curHKey && hParts[curHKey] !== undefined) {
        // 호 설명에 이어붙임
        hParts[curHKey].push(trimmed)
        // 부모 목 블록의 마지막 항목에도 이어붙임
        if (curMKey && mParts[curMKey]?.length > 0) {
          mParts[curMKey][mParts[curMKey].length - 1] += ' ' + trimmed
        }
      } else if (curMKey && mParts[curMKey] !== undefined) {
        mParts[curMKey].push(trimmed)
      }
    }
  }

  // 최종 맵 빌드
  const result = {}
  for (const [key, parts] of Object.entries(mParts)) {
    // 목 수준 항목: 첫 줄은 목 설명, 나머지는 하위 항목(1) 2))
    result[key] = parts.join('\n').trim()
  }
  for (const [key, parts] of Object.entries(hParts)) {
    // 호 수준 항목: 연속행을 공백으로 이어붙임
    result[key] = parts.join(' ').trim()
  }
  return result
}

// ── 두 별표 전문 처리 ──────────────────────────────────────────────────
const text7의2 = readFileSync(join(CRITERIA, '별표7의2_전문.txt'), 'utf-8')
const text7    = readFileSync(join(CRITERIA, '별표7_전문.txt'), 'utf-8')
const allDesc  = {
  ...extractDescriptions(text7,    '별표7'),
  ...extractDescriptions(text7의2, '별표7의2'),
}

// ── 카탈로그 items에 설명 주입 ─────────────────────────────────────────
let updated = 0, missing = 0
for (const [id, item] of Object.entries(catalog.items)) {
  const desc = allDesc[id]
  if (desc) {
    item.설명 = desc
    updated++
  } else {
    console.warn(`⚠️  [${id}] 설명 미매칭 — 카탈로그에 설명 없음으로 유지`)
    missing++
  }
}

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
console.log(`\n✅ 완료: ${updated}개 설명 주입 / ${missing}개 미매칭`)

// ── 샘플 검증 ──────────────────────────────────────────────────────────
const samples = ['국-6-아', '국-6-사', '국-6-자', '신-13-나-9', '신-2-바-1', '신-3-가-5', '신-12-가']
console.log('\n── 샘플 확인 ──')
for (const id of samples) {
  const item = catalog.items[id]
  if (!item) { console.log(`[${id}] 카탈로그에 없음`); continue }
  const preview = (item.설명 ?? '(없음)').slice(0, 100)
  console.log(`\n[${id}] ${item.정식명칭}`)
  console.log(`설명: ${preview}${(item.설명?.length ?? 0) > 100 ? '…' : ''}`)
}
