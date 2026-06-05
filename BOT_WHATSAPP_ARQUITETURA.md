# Arquitetura — Bot de WhatsApp para Agendamento Automático

**Projeto:** EntMídia SaaS  
**Produto:** Bot conversacional que integra WhatsApp ao app de agendamento  
**Fase:** Sprint 3 (pós-MVP)  
**Atualizado:** 2026-05-27

---

## Stack recomendada

| Camada | Tecnologia | Motivo |
|---|---|---|
| Protocolo WA | **Evolution API** (self-hosted) ou **Z-API** (SaaS) | Evolution = gratuito/open-source, controla dados; Z-API = mais simples, paga por sessão |
| Orquestração do fluxo | **n8n** (self-hosted) ou webhook customizado Node.js | n8n para vender como pacote; Node.js puro para integrar ao próprio Next.js |
| Persistência de sessão | Redis (estado da conversa por número de WA) | TTL de 30min — se o usuário parar de responder, reinicia |
| Backend | API routes no Next.js existente | Reaproveita o `SUPABASE_SERVICE_ROLE_KEY` já configurado |
| Hospedagem bot | VPS $10/mês (DigitalOcean / Hetzner) | Evolution API precisa de container Docker |

### Recomendação para escalar como produto: **Evolution API + n8n**
- Evolution API roda em Docker, 1 container por cliente ou multi-tenant
- n8n tem interface visual — você consegue ajustar o fluxo sem código
- Custo por cliente: ~R$25/mês de infra → margem altíssima no plano Pro+Bot

---

## Fluxo conversacional

```
Cliente manda qualquer mensagem
    │
    ▼
[BOT] Oi! Sou o assistente do Salão X. 
      O que você precisa?
      1 - Nova aplicação de prótese
      2 - Manutenção
      3 - Falar com a equipe
    │
    ├── [1 ou 2] → Seleciona serviço
    │       │
    │       ▼
    │   [BOT] Ótimo! Qual profissional você prefere?
    │         (lista nomes dos barbeiros ativos)
    │         0 - Tanto faz (qualquer disponível)
    │       │
    │       ▼
    │   [BOT] Certo! Para qual data você quer agendar?
    │         (aceita texto livre: "amanhã", "sexta", "15/06")
    │       │
    │       ▼
    │   [Chama GET /api/agendar/disponibilidade]
    │       │
    │       ▼
    │   [BOT] Horários disponíveis para [barbeiro] em [data]:
    │         09:00 | 10:30 | 14:00 | 16:30
    │         Responda com o horário desejado.
    │       │
    │       ▼
    │   [BOT] Perfeito! Qual é o seu nome completo?
    │       │
    │       ▼
    │   [BOT] E seu WhatsApp está correto? (número atual)
    │         Responda SIM ou informe outro número.
    │       │
    │       ▼
    │   [Chama POST /api/agendar]
    │       │
    │       ▼
    │   [BOT] ✅ Agendado! 
    │         [nome], seu horário é [dia] às [hora] com [barbeiro].
    │         Endereço: Rua dos Trilhos 1522, Mooca, SP.
    │         Até lá!
    │
    └── [3] → Transfere para humano (marca conversa como "aguardando")
```

---

## API routes necessárias no Next.js

Já existem (criadas nessa sprint):
- `GET /api/agendar/disponibilidade` — retorna slots livres
- `POST /api/agendar` — cria agendamento

Ainda a criar para o bot:
- `POST /api/bot/webhook` — recebe eventos do Evolution API / Z-API
- `GET /api/bot/estado/:numero` — consulta estado atual da conversa (Redis)
- `POST /api/bot/enviar` — envia mensagem para número específico (chamado pelo n8n)

---

## Modelo de estado da conversa (Redis)

```json
{
  "numero": "5511999999999",
  "etapa": "aguardando_horario",
  "servico_id": 1,
  "executor_id": "uuid-barbeiro",
  "data": "2026-06-10",
  "nome": null,
  "ttl": 1800
}
```

Estados possíveis:
- `inicio`
- `aguardando_servico`
- `aguardando_barbeiro`
- `aguardando_data`
- `aguardando_horario`
- `aguardando_nome`
- `aguardando_confirmacao`
- `confirmado`
- `aguardando_humano`

---

## Lembretes automáticos (bônus incluso no plano Pro+Bot)

Cron job rodando a cada hora:
1. Busca agendamentos do dia seguinte com status `AGENDADO`
2. Para cada agendamento, envia WA para o cliente:
   > "Olá [nome]! Lembrando do seu horário amanhã às [hora] com [barbeiro] no Salão X. Confirme respondendo SIM ou cancele respondendo NÃO."
3. Se responder NÃO → atualiza status para `CANCELADO` automaticamente
4. Se não responder em 2h → envia segundo lembrete

---

## Custo e margem por cliente

| Item | Custo mensal |
|---|---|
| Evolution API (VPS compartilhado multi-tenant) | ~R$ 8 por cliente |
| Número WA Business API ou WA não-oficial | R$ 0 (WA não-oficial) ou R$ 50+ (oficial) |
| Tempo de manutenção | ~30min/mês |
| **Total custo** | **~R$ 8–15/cliente** |
| **Plano Pro+Bot** | **R$ 497/mês** |
| **Margem bruta** | **~R$ 480/cliente** |

---

## Roadmap de implementação

### Semana 1 — Infraestrutura
- [ ] Subir Evolution API em Docker no Hetzner CX11 (€3,79/mês)
- [ ] Configurar Redis (pode usar Upstash — gratuito até 10k req/dia)
- [ ] Criar `POST /api/bot/webhook` no Next.js
- [ ] Testar envio/recebimento básico de mensagem

### Semana 2 — Fluxo principal
- [ ] Implementar máquina de estados em Redis
- [ ] Fluxo completo: serviço → barbeiro → data → horário → nome → confirmação
- [ ] Integrar com `/api/agendar/disponibilidade` e `/api/agendar`
- [ ] Testar end-to-end com número real

### Semana 3 — Lembretes e polimento
- [ ] Cron de lembretes 24h antes
- [ ] Cron de lembretes 2h antes
- [ ] Fluxo de cancelamento por WA
- [ ] Notificação no app quando novo agendamento chega pelo bot

### Semana 4 — Produto escalável
- [ ] Script de onboarding multi-tenant: 1 comando cria cliente novo no Evolution
- [ ] Dashboard no n8n para monitorar fluxos por cliente
- [ ] Documentação de instalação para revenda

---

## Decisão: Z-API vs Evolution API

| Critério | Z-API | Evolution API |
|---|---|---|
| Custo | R$149/mês por instância | Gratuito (infra própria ~R$25) |
| Complexidade | Baixa — API REST simples | Média — Docker + configuração |
| Controle de dados | Dados na Z-API | Dados no seu servidor |
| Escalabilidade | R$149 × N clientes | Custo fixo da VPS, divide entre clientes |
| **Recomendação para escala** | ❌ | ✅ |
| **Recomendação para testar rápido** | ✅ | ❌ |

**Estratégia:** começar com Z-API nos primeiros 3 clientes (validação rápida sem infra), migrar para Evolution API quando tiver 5+ clientes (margem justifica).

---

## Estratégia de captação de salões

### Canal 1 — WhatsApp direto (principal)
1. Extrair lista de barbearias e salões de prótese capilar via Google Maps API ou manualmente
2. Filtrar por: porte médio, Instagram ativo, não tem app próprio
3. Mensagem de abordagem:
   > "Oi [nome do dono]! Vi que o [nome do salão] está crescendo no Instagram — parabéns! Sou o Dylan, da EntMídia. Desenvolvemos um sistema de agendamento específico para salões de prótese capilar, já rodando no salão do Márcio Gonzalez (189k seguidores na Mooca). Em 48h seu salão tem link de agendamento online + bot no WA agendando sozinho. Posso te mostrar em 10min como funciona?"
4. Meta: 30 abordagens/dia → 5% taxa → 1-2 demos/dia → 20% fechamento → 2-4 clientes/semana

### Canal 2 — Instagram orgânico (credibilidade)
- Perfil: @entmidia (ou subpágina do Dylan)
- Conteúdo: antes/depois (caderninho vs app), prints do sistema funcionando, depoimento Márcio
- Frequência: 3 posts/semana

### Canal 3 — Google Ads BOFU (fase 2, a partir de 10 clientes)
- Keywords: "sistema agendamento barbearia", "app agendamento salão prótese capilar"
- CPC estimado: R$1,50-3,00
- Budget inicial: R$30/dia
- Página de destino: landing page EntMídia (criar via skill landing-page)

---

## Próximos passos imediatos

1. **Hoje:** Testar Z-API com conta WA de teste — validar fluxo básico em 2h
2. **Esta semana:** Implementar `/api/bot/webhook` e fluxo simples no Márcio Gonzalez como piloto
3. **Semana que vem:** Primeira abordagem WA para 10 salões com pitch + demo ao vivo
4. **30 dias:** Fechar 3 clientes pagantes → R$891-1.491/mês recorrente
