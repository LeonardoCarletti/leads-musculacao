# leads-musculacao

Sistema completo de captacao de leads para consultoria de treinamento de musculacao.
Powered by Comet (navegacao e coleta) + Node/Express (API REST) + Postgres (banco).

---

## Estrutura do projeto

```
leads-musculacao/
  api/
    .env.example      <- Copie para .env e preencha
    Dockerfile
    package.json
    server.js         <- API completa
  db/
    init.sql          <- Tabelas leads + disparos
  docker-compose.yml
```

---

## Como subir localmente

```bash
# 1. Clone o repositorio
git clone https://github.com/LeonardoCarletti/leads-musculacao.git
cd leads-musculacao

# 2. Crie o .env da API
cp api/.env.example api/.env

# 3. Suba tudo
docker compose up -d --build

# 4. Teste
curl http://localhost:3000/health
```

---

## Endpoints da API

| Metodo | Rota                  | Descricao                                      |
|--------|----------------------|------------------------------------------------|
| GET    | /health              | Healthcheck da API + DB                        |
| POST   | /api/leads           | Salva array de leads no banco                  |
| GET    | /api/leads           | Lista leads (filtros: niche, status, city)     |
| GET    | /api/leads/disparo   | Lista leads prontos para disparo (sem contato) |
| POST   | /api/disparos        | Registra disparo feito (WhatsApp ou email)     |
| GET    | /api/relatorio       | Relatorio geral: total, por niche, por status  |

---

## Fluxo operacional

### 1. Captacao (Comet + Google Maps)
Cole o prompt de captacao no Comet. Ele navega no Google/Maps,
extrai dados e faz POST para http://localhost:3000/api/leads.

### 2. Ver leads prontos para disparo
```
GET http://localhost:3000/api/leads/disparo
```
Retorna leads com `canal_sugerido`:
- `whatsapp` se tiver telefone
- `email` se tiver email e nao tiver telefone

### 3. Fazer disparo manual
Abra WhatsApp Web ou Gmail. Envie a mensagem usando o template abaixo.
Depois registre o disparo:
```
POST http://localhost:3000/api/disparos
{ "lead_id": 1, "canal": "whatsapp", "template": "intro_consultoria_v1" }
```
O sistema atualiza o status do lead para `contatado`.

### 4. Ver relatorio
```
GET http://localhost:3000/api/relatorio
```

---

## Templates de disparo

### WhatsApp - template intro_consultoria_v1
```
Ola, tudo bem? Sou o Leonardo, personal trainer especialista em hipertrofia e musculacao.

Vi que voces trabalham com treino de forca por aqui e queria apresentar uma consultoria
que ajuda academias e personals a estruturarem protocolos de treino com resultados mais
consistentes para os alunos.

Posso mostrar em 15 minutos como funciona? Sem compromisso.
```

### Email - template intro_consultoria_v1
```
Assunto: Consultoria de treinamento para musculacao - 15min pode mudar seus resultados

Ola,

Meu nome e Leonardo Carletti, especialista em treino de forca e hipertrofia.

Estou entrando em contato porque percebi que voce/sua academia tem um ótimo trabalho
com treino de forca. Desenvolvi uma metodologia de consultoria que ajuda professores
e academias a otimizar protocolos de hipertrofia, aumentar retencao de alunos e
melhorar resultados documentados.

Gostaria de agendar 15 minutos para apresentar como funciona. Pode ser esta semana?

Att,
Leonardo Carletti
Consultoria de Treinamento | Musculacao e Performance
```

---

## Queries SQL uteis

```sql
-- Leads com telefone (prioridade WhatsApp)
SELECT * FROM leads WHERE phone IS NOT NULL AND status = 'novo' ORDER BY created_at;

-- Leads com email (prioridade email)
SELECT * FROM leads WHERE email IS NOT NULL AND phone IS NULL AND status = 'novo';

-- Relatorio por bairro
SELECT city, niche, COUNT(*) FROM leads GROUP BY city, niche ORDER BY COUNT(*) DESC;

-- Leads ja contatados
SELECT l.title, l.phone, l.email, d.canal, d.sent_at
FROM leads l JOIN disparos d ON d.lead_id = l.id
ORDER BY d.sent_at DESC;
```

---

## Prompt Comet (macro fixa - Zona Norte SP)

Cole isso direto no Comet para iniciar a captacao:

```
Voce e um agente de prospeccao de leads para consultoria de treinamento de musculacao.

OBJETIVO:
- Encontrar na ZONA NORTE DE SAO PAULO:
  academias de musculacao, box/crossfit, studios de treino de forca,
  personal trainers focados em hipertrofia.
- Extrair dados estruturados.
- Enviar em lote para: POST http://localhost:3000/api/leads

FORMATO:
{ "title": "...", "address": "...", "phone": "...", "site": "...",
  "email": "...", "niche": "academia|performance",
  "city": "Sao Paulo - Zona Norte", "source": "google_maps" }

CONSULTAS INICIAIS:
- academia de musculacao Zona Norte Sao Paulo
- crossfit Zona Norte Sao Paulo
- personal trainer hipertrofia Zona Norte Sao Paulo
- academia musculacao Santana Sao Paulo
- academia musculacao Tucuruvi Sao Paulo

INSTRUCOES:
1. Teste GET http://localhost:3000/health
2. Envie 1 lead fake para testar POST /api/leads
3. Inicie coleta real em lotes de 50
4. Registre relatorio ao final
```