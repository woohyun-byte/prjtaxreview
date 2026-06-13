import { Container } from "@/components/layout/container"
import { AssessmentForm } from "@/components/assessment-form"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  return (
    <Container className="py-10 md:py-16">
      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">대기업</Badge>
          <Badge variant="outline">조특법 제10조</Badge>
          <Badge variant="outline">별표7 / 별표7의2</Badge>
          <Badge variant="outline">1차 초안</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          조선 R&D 세액공제 적격성 판정
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          연구과제 정보를 입력하면 조세특례제한법 제10조 신성장·원천기술(별표7) 및
          국가전략기술(별표7의2) 해당여부를 1차 판정합니다.
          <br />
          <span className="text-sm">
            최종 판단은 기술심의위원회·국세청 사전심사·세무 전문가 검토로 확정하십시오.
          </span>
        </p>
      </div>

      <AssessmentForm />
    </Container>
  )
}
