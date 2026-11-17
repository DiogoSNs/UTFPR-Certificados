# Guia de Deploy Gratuito (Sem Cartão de Crédito)

Arquitetura recomendada para produção sem custo e sem cartão:
- **Banco de Dados:** MongoDB Atlas (Plano Free M0 — 512 MB)
- **Site + API:** Render (Web Service Free com Docker)
- **Atualização Diária:** GitHub Actions (Cron diário às 03:00 BRT)

---

## 1. Criar o banco no MongoDB Atlas (Free M0)

1. Acesse [cloud.mongodb.com](https://cloud.mongodb.com) e crie uma conta gratuita (não pede cartão).
2. Crie um cluster **M0 Free** (ex.: AWS `us-east-1` ou `sa-east-1`).
3. Em **Database Access**, crie um usuário e senha de banco (ex.: `utfcerts_user`) com permissão de leitura e escrita.
4. Em **Network Access**, adicione o IP `0.0.0.0/0` (necessário para o Render e o GitHub Actions conectarem).
5. Em **Connect → Drivers**, copie a string de conexão no formato:
   ```
   mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/certs?retryWrites=true&w=majority
   ```

---

## 2. Migrar a base já coletada do Docker local para o Atlas

Como os **13.901 eventos** e **180.580 participantes** já estão salvos no seu Docker local, você pode enviá-los direto para o Atlas sem precisar rodar o scraper completo de novo.

Com os containers locais rodando, execute no PowerShell (substituindo pela sua URI do Atlas):

```powershell
# 1. Exporta a base local do container MongoDB
docker exec utfcerts_mongo mongodump --db certs --out /tmp/dump

# 2. Envia o dump para o seu MongoDB Atlas
docker exec utfcerts_mongo mongorestore --uri "mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/certs" --nsInclude="certs.*" /tmp/dump/certs
```

> **Dica:** Ao rodar o `mongorestore`, ele também recria os índices já configurados no banco local.

---

## 3. Subir para o GitHub e ativar a atualização automática

> **Atenção aos `.git` internos:** as pastas `backend/sgceScripts` e `frontend/utfCerts` vieram de clones separados. Se você quiser versionar tudo em um único repositório seu no GitHub (`DiogoSNs/utfpr-certificados`), remova antes as pastas `.git` internas (`backend/sgceScripts/.git` e `frontend/utfCerts/.git`) para o Git não tratá-las como submódulos vazios, e então faça `git init` na raiz.

1. Crie um repositório no seu GitHub (`DiogoSNs`) e dê `git push`.
2. No repositório do GitHub, vá em **Settings → Secrets and variables → Actions → New repository secret**:
   - Nome: `MONGO_URI`
   - Valor: `mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/certs?retryWrites=true&w=majority`
3. O workflow `.github/workflows/daily-sync.yml` já rodará automaticamente todo dia às **03:00 (horário de Brasília)** atualizando o ano atual e o anterior — e também pode ser disparado manualmente na aba **Actions → Daily SGCE Sync → Run workflow**.

---

## 4. Publicar no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com).
2. Clique em **New → Blueprint** e conecte o seu repositório do GitHub (o Render lerá automaticamente o arquivo `render.yaml`).
   - *Ou crie manualmente via **New → Web Service → Docker** apontando o Dockerfile para `frontend/utfCerts/Dockerfile` e Docker Context para `frontend/utfCerts`, com Health Check em `/api/health`.*
3. Nas variáveis de ambiente (`Environment Variables`), preencha:
   - `MONGODB_KEY`: `mongodb+srv://USUARIO:SENHA@SEU-CLUSTER.mongodb.net/certs?retryWrites=true&w=majority`
4. Clique em **Deploy**. Em alguns minutos o site estará no ar em `https://seu-servico.onrender.com`!
