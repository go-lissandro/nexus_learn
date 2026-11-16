# NexusLearn

Plataforma de estudo gamificada: cursos, XP, níveis, leaderboard e um painel administrativo com controle de sessões em tempo real (o admin pode revogar acessos mesmo com JWT válido).

- **Backend:** FastAPI + SQLAlchemy async + PostgreSQL
- **Frontend:** React (Create React App) + Tailwind CSS

## Como rodar

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000 · documentação: http://localhost:8000/docs

As tabelas são criadas automaticamente na primeira subida. Para criar o primeiro administrador, cadastre-se e rode:

```bash
docker compose exec db psql -U postgres -d nexuslearn -c "update users set is_admin = true where email = 'voce@exemplo.com'"
```

## Testes

Os testes de integração do backend usam um Postgres real:

```bash
cd backend
pip install -r requirements.txt pytest httpx
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/nexuslearn_test python -m pytest tests
```

## Status

| Área | Situação |
|------|----------|
| Cadastro, login, logout e sessões | pronto |
| Painel admin (usuários, sessões, revogação) | pronto |
| XP, nível e leaderboard | pronto (`POST /gamification/xp/award` para admins) |
| Dashboard do aluno | **a fazer**: a rota `/` ainda é um placeholder |
| Cursos e aulas | modelos prontos (`Course`, `Lesson`, `UserProgress`), faltam rotas e telas |
| Badges e desafios | modelos prontos, faltam rotas e telas |
