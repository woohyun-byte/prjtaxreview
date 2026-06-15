"""
별표7_전문.txt + 별표7의2_전문.txt 재생성 스크립트
소스: 별표7_국가전략신성장원천_v10.1_통합.xlsx
실행: python scripts/build-annex-fulltext.py
"""

import openpyxl
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

XLSX = Path(r"Z:\01_TechPlanning\08_사내부서대응\07_세액공제\99_참고자료\정부발간물\02_별표 시행령\별표7_국가전략신성장원천_v10.1_통합.xlsx")
OUT = Path(__file__).parent.parent / "lib" / "criteria"
REVISION = "2026. 2. 27."


def 분야순(s: str) -> int:
    m = re.match(r"^(\d+)\.", s)
    return int(m.group(1)) if m else 999


def main() -> None:
    print(f"읽는 중: {XLSX}")
    wb = openpyxl.load_workbook(str(XLSX), data_only=True)
    ws = wb["별표7_통합"]
    data = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"  전체 {len(data)}행")

    # 신성장: 구분 → 분야 → [(no, 대상, 설명, 비고)]
    신성장: dict[str, dict[str, list]] = {}
    # 국가전략: 분야 → [(no, 대상, 설명, 비고)]
    국가전략: dict[str, list] = {}

    for r in data:
        no = (r[0] or "").strip()
        if not no:
            continue
        구분 = (r[1] or "").strip()
        분야 = (r[2] or "").strip()
        대상 = (r[3] or "").strip()
        설명 = (r[4] or "").strip()
        비고 = (r[6] or "").strip()

        if no.startswith("국-"):
            국가전략.setdefault(분야, []).append((no, 대상, 설명, 비고))
        else:
            신성장.setdefault(구분, {}).setdefault(분야, []).append((no, 대상, 설명, 비고))

    신성장_cnt = sum(len(items) for 구분d in 신성장.values() for items in 구분d.values())
    국가전략_cnt = sum(len(items) for items in 국가전략.values())
    삭제_cnt = sum(
        1 for 구분d in 신성장.values()
        for items in 구분d.values()
        for _, _, _, 비고 in items
        if 비고 == "삭제"
    )
    print(f"  신성장 {신성장_cnt}행, 국가전략 {국가전략_cnt}행, 삭제 {삭제_cnt}개")

    # ── 별표7_전문.txt ──────────────────────────────────────────
    lines: list[str] = [
        "■ 조세특례제한법 시행령 [별표 7]",
        f"<개정 {REVISION}>",
        "",
        "신성장ㆍ원천기술의 범위",
        "(제9조제2항 관련)",
        "",
    ]

    for 구분 in sorted(신성장.keys(), key=분야순):
        lines.append(구분)
        for 분야, items in 신성장[구분].items():
            lines.append(분야)
            for _, 대상, 설명, 비고 in items:
                if 비고 == "삭제":
                    lines.append(f" {대상} 삭제")
                elif 설명:
                    lines.append(f" {대상}: {설명}")
                else:
                    lines.append(f" {대상}")
            lines.append("")

    out7 = OUT / "별표7_전문.txt"
    out7.write_text("\n".join(lines), encoding="utf-8")
    print(f"  → {out7}  ({len(lines)}행)")

    # ── 별표7의2_전문.txt ───────────────────────────────────────
    lines2: list[str] = [
        "■ 조세특례제한법 시행령 [별표 7의2]",
        f"<개정 {REVISION}>",
        "",
        "국가전략기술의 범위",
        "(제9조제6항 관련)",
        "",
    ]

    for 분야 in sorted(국가전략.keys(), key=분야순):
        lines2.append(분야)
        for _, 대상, 설명, 비고 in 국가전략[분야]:
            if 비고 == "삭제":
                lines2.append(f" {대상} 삭제")
            elif 설명:
                lines2.append(f" {대상}: {설명}")
            else:
                lines2.append(f" {대상}")
        lines2.append("")

    out72 = OUT / "별표7의2_전문.txt"
    out72.write_text("\n".join(lines2), encoding="utf-8")
    print(f"  → {out72}  ({len(lines2)}행)")
    print("완료.")


if __name__ == "__main__":
    main()
