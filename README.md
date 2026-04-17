# 🚀 CRM de SDR com Geração de Mensagens por IA

## 📌 Descrição do Projeto

Este projeto consiste em um Mini CRM voltado para equipes de SDR (Sales Development Representatives), com foco na gestão de leads e geração de mensagens personalizadas utilizando Inteligência Artificial.

A aplicação permite organizar leads em um funil de pré-vendas, criar campanhas com contexto específico e gerar automaticamente mensagens personalizadas com base nos dados de cada lead.

---

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js + Express
* **Banco de Dados:** Supabase (PostgreSQL)
* **Autenticação:** Supabase Auth
* **IA:** OpenAI API
* **Versionamento:** Git + GitHub
* **Ambiente:** Replit

---

## 🧠 Decisões Técnicas

### 📊 Estrutura do Banco de Dados

A modelagem foi feita considerando multi-tenancy (multi-workspace), onde cada usuário possui seu próprio workspace e os dados são isolados por meio de `workspace_id`.

Principais tabelas:

* `workspaces`
* `leads`
* `campaigns`
* `messages`

Essa estrutura garante escalabilidade e organização dos dados.

---

### 🤖 Integração com LLM (IA)

A geração de mensagens foi implementada utilizando a API da OpenAI.

As mensagens são geradas com base em:

* Nome do lead
* Empresa
* Cargo
* Contexto da campanha

O prompt foi estruturado para gerar mensagens personalizadas, evitando conteúdo genérico.

---

### 🏢 Multi-tenancy

O sistema foi projetado para suportar múltiplos workspaces, garantindo que cada usuário acesse apenas seus próprios dados.

Essa separação é feita utilizando:

* `workspace_id` nas tabelas
* Políticas de segurança (Row Level Security - RLS) no Supabase

---

### ⚙️ Desafios e Soluções

**Desafio:** Integração entre frontend, backend e IA
**Solução:** Separação clara de responsabilidades entre rotas, serviços e integrações externas

**Desafio:** Garantir dados consistentes para geração de mensagens
**Solução:** Estruturação dos dados do lead e uso de prompts dinâmicos

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação

* Cadastro de usuários
* Login com Supabase Auth

---

### 🏢 Workspace

* Criação de workspace por usuário
* Isolamento de dados por workspace

---

### 👥 Gestão de Leads

* Cadastro de leads
* Listagem de leads
* Atualização de informações
* Organização por etapas do funil

---

### 📊 Funil de Vendas

* Estrutura de etapas (Base, Lead Mapeado, etc.)
* Atualização de status do lead

---

### 📢 Campanhas

* Criação de campanhas
* Definição de contexto
* Configuração de prompt para IA

---

### 🤖 Geração de Mensagens com IA

* Geração de 2 a 3 mensagens personalizadas
* Uso de dados do lead
* Integração com OpenAI

---

### 💬 Mensagens

* Visualização de mensagens geradas
* Persistência no banco de dados

---

## 🌐 Aplicação Publicada

🔗 Acesse a aplicação:
https://replit.com/join/qbvyutaxzy-dnmuria

---

## ▶️ Demonstração em Vídeo

🎥 Assista ao vídeo:
https://drive.google.com/file/d/1bcboqCcmqU9oc_f2kELtjGeXu5-1yA3s/view?usp=sharing

---

## ⚙️ Como Executar o Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/brunomuria/Code-Asset-Manager.git
```



---

## 📈 Possíveis Melhorias (Diferenciais)

* Geração automática de mensagens por gatilho de etapa
* Dashboard com métricas avançadas
* Histórico de atividades
* Sistema de permissões (admin/membro)
* Kanban com drag-and-drop

---

## 📌 Considerações Finais

O foco do projeto foi priorizar um MVP funcional, garantindo integração real com backend e IA, ao invés de apenas uma interface visual.

---

## 👨‍💻 Autor

Bruno Muria
📧 bruno.muria@outlook.com
📱 (51) 92000-4471

---
