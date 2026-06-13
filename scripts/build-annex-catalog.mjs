#!/usr/bin/env node
/**
 * scripts/build-annex-catalog.mjs
 * 별표7/7의2 HWP→JSON + 매핑표.xlsx → lib/criteria 스냅샷 생성
 *
 * Usage: node scripts/build-annex-catalog.mjs ["소스폴더"]
 * 소스폴더 기본값: G:\내 드라이브\01_업무\01_세액공제\세액공제 시행령\20260401
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEBAPP = resolve(__dirname, '..')
const OUT = join(WEBAPP, 'lib', 'criteria')
const SRC = process.argv[2] ??
  'G:\\내 드라이브\\01_업무\\01_세액공제\\세액공제 시행령\\20260401'

mkdirSync(OUT, { recursive: true })
console.log('📁 소스:', SRC)
console.log('📁 출력:', OUT)

// ── 1. HWP JSON → 전문 텍스트 ─────────────────────────────────
function extractText(filePath) {
  const data = JSON.parse(readFileSync(filePath, 'utf-8'))
  const parts = []
  function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return }
    if (!o || typeof o !== 'object') return
    for (const [k, v] of Object.entries(o)) {
      if (k === 't' && typeof v === 'string') parts.push(v)
      else walk(v)
    }
  }
  walk(data)
  return parts.join('\n')
}

// ── 2. 전문 텍스트 → 항목 사전 파싱 ───────────────────────────
// 별표7의2: 분야(col0 숫자), 목(1~3sp 한글자), 호(2~5sp 숫자)
// 별표7:    분야(col0 숫자), 목(col0 한글자 = 들여쓰기 없음), 호(1sp 숫자)
function parseItems(text, 별표) {
  const prefix = 별표 === '별표7의2' ? '국' : '신'
  const 구분명 = prefix === '국' ? '국가전략' : '신성장'
  const items = {}
  let curF = null   // 현재 분야 번호
  let curM = null   // 현재 목 글자

  // 별표에 따라 목/호 패턴 분기
  const mokRe  = 별표 === '별표7의2'
    ? /^ {1,3}([가-힣])\.\s+(.+)/   // 별표7의2: 1~3sp + 한글자 + ". "
    : /^([가-힣])\.\s+(.+)/          // 별표7:   col0 + 한글자 + ". "
  const hoRe   = 별표 === '별표7의2'
    ? /^ {2,5}(\d+)\)\s+(.*)/        // 별표7의2: 2~5sp + 숫자 + ") "
    : /^[ ]?(\d+)\)\s+(.*)/          // 별표7:   0~1sp + 숫자 + ") " (HWP 변환 들여쓰기 불일치 허용)

  for (const line of text.split('\n')) {
    // 분야: "N. 분야명" (들여쓰기 없음, 공통)
    const fdm = line.match(/^(\d{1,2})\.\s+\S/)
    if (fdm) { curF = fdm[1]; curM = null; continue }

    // 목
    const mokm = line.match(mokRe)
    if (mokm && curF) {
      curM = mokm[1]
      const name = mokm[2].split(/\s*[：:]/)[0].trim()  // 콜론 앞까지 (공백 포함 이름 보존)
      if (name.length >= 2) {
        items[`${prefix}-${curF}-${curM}`] = {
          별표, 구분: 구분명,
          조문위치: `${curF}.${curM}목`,
          정식명칭: name,
        }
      }
      continue
    }

    // 호
    const hom = line.match(hoRe)
    if (hom && curF && curM) {
      const ho = hom[1]
      const raw = (hom[2] ?? '').trim()
      // "삭제" 항목 제외
      if (!raw || raw.startsWith('삭제')) continue
      const name = raw.split(/[：:\s]\s*[：:]/)[0]   // "기술명 : 내용" → "기술명 "
                      .split(/[：:]/)[0].trim()
      if (name.length >= 2) {
        items[`${prefix}-${curF}-${curM}-${ho}`] = {
          별표, 구분: 구분명,
          조문위치: `${curF}.${curM}목 ${ho})`,
          정식명칭: name,
        }
      }
    }
  }
  return items
}

// ── 3. xlsx → rows (한글 경로 처리: temp Python 파일 사용) ────
function readXlsx(xlsxPath) {
  const pyPath = join(tmpdir(), 'taxd_parse_xlsx.py')
  const xlsxPosix = xlsxPath.replace(/\\/g, '/')
  const py = `# -*- coding: utf-8 -*-
import openpyxl, json, sys
sys.stdout.reconfigure(encoding='utf-8')
wb = openpyxl.load_workbook("${xlsxPosix}", data_only=True)
ws = wb.active
rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    cells = [(str(c) if c is not None else '').strip() for c in row]
    if any(c for c in cells):
        rows.append(cells)
print(json.dumps(rows, ensure_ascii=False))
`
  writeFileSync(pyPath, py, 'utf-8')
  const out = execSync(`python "${pyPath}"`, {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })
  return JSON.parse(out.trim())
}

// xlsx 셀 → ID 목록 (가/나/다 형태 전개)
function extractIds(cell) {
  if (!cell) return []
  return cell.split('\n').flatMap(l => {
    const m = l.trim().match(/^((?:국|신))-(\d+)-([가-힣]+(?:\/[가-힣]+)*)(-\d+)?/)
    if (!m) return []
    const [, pfx, num, mokPart, ho = ''] = m
    return mokPart.split('/').map(mok => `${pfx}-${num}-${mok}${ho}`)
  })
}

// xlsx 셀 → [id, name] 쌍 목록
function extractIdNames(cell) {
  if (!cell) return []
  return cell.split('\n').flatMap(l => {
    // "국-6-아. 명칭" or "신-12-가/나/다. 명칭" 형식
    const m = l.trim().match(/^((?:국|신)-\d+-[가-힣]+(?:\/[가-힣]+)*(?:-\d+)?)\.\s*(.+)/)
    if (!m) return []
    const [, rawId, xlsxName] = m
    const baseM = rawId.match(/^((?:국|신))-(\d+)-([가-힣]+(?:\/[가-힣]+)*)((?:-\d+)?)$/)
    if (!baseM) return [[rawId, xlsxName.trim()]]
    const [, pfx, num, mokPart, ho = ''] = baseM
    return mokPart.split('/').map(mok => [`${pfx}-${num}-${mok}${ho}`, xlsxName.trim()])
  })
}

// ── MAIN ──────────────────────────────────────────────────────
const 별표7JSON = join(SRC,
  '[별표 7] 신성장ㆍ원천기술의 범위(제9조제2항 관련)(조세특례제한법 시행령).json')
const 별표7의2JSON = join(SRC,
  '[별표 7의2] 국가전략기술의 범위(제9조제6항 관련)(조세특례제한법 시행령).json')
const xlsxPath = join(SRC, '세액공제 기술분류 매핑표.xlsx')

console.log('\n1️⃣  별표7의2 JSON 파싱...')
const text7의2 = extractText(별표7의2JSON)
writeFileSync(join(OUT, '별표7의2_전문.txt'), text7의2, 'utf-8')
const items7의2 = parseItems(text7의2, '별표7의2')
console.log(`   → ${Object.keys(items7의2).length}개 항목 파싱`)

console.log('\n2️⃣  별표7 JSON 파싱...')
const text7 = extractText(별표7JSON)
writeFileSync(join(OUT, '별표7_전문.txt'), text7, 'utf-8')
const items7 = parseItems(text7, '별표7')
console.log(`   → ${Object.keys(items7).length}개 항목 파싱`)

const allParsed = { ...items7, ...items7의2 }

console.log('\n3️⃣  xlsx 조선분류 파싱...')
const rows = readXlsx(xlsxPath)
console.log(`   → ${rows.length}행`)

// xlsx에 등장하는 ID → 명칭 쌍 수집
const xlsxIdNames = new Map()
for (const row of rows) {
  for (const cell of [row[1], row[2]]) {  // 우선(col1), 보조(col2)
    for (const [id, name] of extractIdNames(cell)) {
      if (!xlsxIdNames.has(id)) xlsxIdNames.set(id, name)
    }
  }
}

// catalog items: xlsx 등장 ID만, 정식명칭은 JSON 원문 우선
const catalogItems = {}
let warnings = 0
for (const [id, xlsxName] of xlsxIdNames) {
  const parsed = allParsed[id]
  if (parsed) {
    if (parsed.정식명칭 !== xlsxName) {
      console.warn(`   ⚠️  [${id}] 명칭 불일치 → JSON 원문 채택`)
      console.warn(`       JSON: ${parsed.정식명칭}`)
      console.warn(`       xlsx: ${xlsxName}`)
      warnings++
    }
    catalogItems[id] = parsed
  } else {
    console.warn(`   ⚠️  [${id}] JSON 매칭 실패 → xlsx 명칭 폴백: ${xlsxName}`)
    warnings++
    // 폴백: ID 패턴에서 조문위치 추론
    const pfxM = id.match(/^(국|신)-(\d+)-([가-힣])(-\d+)?$/)
    if (pfxM) {
      const [, pfx, num, mok, ho] = pfxM
      catalogItems[id] = {
        별표: pfx === '국' ? '별표7의2' : '별표7',
        구분: pfx === '국' ? '국가전략' : '신성장',
        조문위치: ho ? `${num}.${mok}목 ${ho.slice(1)})` : `${num}.${mok}목`,
        정식명칭: xlsxName,
      }
    }
  }
}

// 조선분류 구성
const 조선분류 = rows
  .map(row => ({
    대분류: row[0] ?? '',
    우선: extractIds(row[1]),
    보조: extractIds(row[2]),
    예시: row[3] ?? '',
    강조: row[4] ?? '',
  }))
  .filter(r => r.대분류)

// ── 저장 ───────────────────────────────────────────────────────
const catalog = {
  출처: '조특법 시행령 별표7/7의2 (제36127호, 2026.4.1 시행, 개정 2026.2.27) + 세액공제 기술분류 매핑표.xlsx',
  개정일: '2026.2.27',
  items: catalogItems,
  조선분류,
}
writeFileSync(join(OUT, 'annex-catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8')

console.log('\n✅ 완료')
console.log(`   catalog items: ${Object.keys(catalogItems).length}개, 경고: ${warnings}개`)
console.log(`   조선분류: ${조선분류.length}행`)
console.log(`   별표7_전문.txt: ${text7.length}자`)
console.log(`   별표7의2_전문.txt: ${text7의2.length}자`)
