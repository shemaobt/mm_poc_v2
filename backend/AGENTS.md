# Backend Agent Guidelines (mm_poc_v2)

This file defines **backend-specific** conventions for LLM agents working in `backend/`. It extends the repository-wide [AGENTS.md](../AGENTS.md): follow those global guidelines first, then apply what is below.

**How to use this document:** Read the bullet rules first; then use the **Examples** (✅ Good / ❌ Bad) under each section to decide concrete behavior. When in doubt, prefer the “Good” pattern and avoid the “Bad” one.

---

## 1. Stack and Runtime

- **Framework**: FastAPI
- **Server**: Uvicorn (dev) / Gunicorn (production)
- **Package manager**: **uv** — all dependency management via `pyproject.toml` and `uv.lock`
- **Database**: PostgreSQL via **Prisma** (Python client: `prisma`)
- **Validation / schemas**: Pydantic v2
- **Auth**: JWT (python-jose), bcrypt for passwords
- **AI/LLM**: LangChain (langchain-anthropic, langchain-core) for all LLM calls; prompts and client in `app.ai/`
- **Other**: httpx, python-dotenv, pydantic-settings; text-fabric for BHSA data; Google Cloud Storage where used

Use only these stack choices. Do not introduce a different ORM, web framework, or auth library.

### Package management with uv

- **Add dependencies**: `uv add <package>` — adds to `pyproject.toml` and updates `uv.lock`
- **Add dev dependencies**: `uv add --dev <package>`
- **Sync environment**: `uv sync` — installs all dependencies from lockfile
- **Run commands**: `uv run <command>` — runs command in the virtual environment
- **Lock dependencies**: `uv lock` — regenerates lockfile from `pyproject.toml`

**Examples:**

- ✅ **Good:** `uv add requests` to add a new dependency
- ❌ **Bad:** Manually editing `pyproject.toml` without running `uv lock`
- ✅ **Good:** `uv run pytest` to run tests
- ❌ **Bad:** `pip install` inside the project — use uv for all dependency management

---

## 2. Project Structure

```
backend/
├── app/
│   ├── main.py           # create_app(), lifespan, router registration
│   ├── ai/               # AI/LLM layer: prompts, schemas, LangChain client
│   │   ├── client.py     # LangChain client (call_llm_for_json, call_llm_for_text, LLMConfig)
│   │   ├── prompts/      # System prompts for Claude (participants, events, translation, etc.)
│   │   ├── schemas/      # TRIPOD schema, target languages, allowed values
│   │   └── context_builders.py  # Functions to build passage context for prompts
│   ├── api/              # HTTP access layer only (no logic)
│   ├── core/             # config, database, auth_middleware
│   ├── models/           # Pydantic schemas (request/response)
│   └── services/         # business logic, data access
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/              # one-off or seed scripts
├── pyproject.toml        # dependencies and project metadata (uv)
├── uv.lock               # locked dependencies (committed to git)
├── Dockerfile            # production build
└── Dockerfile.dev        # development build
```

### API layer: access only, no logic

- **api/** is **only an access layer** for the frontend. It must **never** contain business logic, validation rules, or data access. Every endpoint must **only** parse the request, optionally validate with Pydantic, **call only the service function**  that represents the operation, and return the response (or translate exceptions to HTTP).
- Do not put Prisma calls, business rules, or branching logic in the API layer. If an endpoint needs more than “call service and return”, move that behavior into a service and keep the router thin.
- **api/** exists only to expose backend capabilities to the frontend over HTTP; the service layer represents and implements each capability.

**Examples:**

- ✅ **Good:** Router function: get path/query params → validate body with Pydantic → `result = await SomeService.get_by_passage(passage_id)` → return `result` (or raise `HTTPException` on service error).
- ❌ **Bad:** Router that contains `await db.passage.find_many(...)`, `if not user: raise ...`, or any business rule; move all of that into a service and call the service from the router.
- ✅ **Good:** `@router.get("/passages/{passage_id}/events")` → `return await EventService.get_by_passage(passage_id)`; no logic in the router.
- ❌ **Bad:** Router that builds response dicts, loops over relations, or checks permissions beyond `Depends(get_current_approved_user)`; put that in a service.
- ✅ **Good:** API module only imports from `app.services.*`, `app.core.*`, and `app.models.*`; it does not implement domain or data logic.
- ❌ **Bad:** API module that imports `db` and performs queries; the API layer must not talk to the database directly.

### AI layer: prompts, schemas, LangChain client

- **ai/** is the **centralized location for all AI-related assets**. This includes LLM prompts, schema definitions, the LangChain client, and context-building utilities.
- **ai/client.py** is the **LangChain-based LLM client**. All LLM calls must go through this module. It provides:
  - `call_llm_for_json()` — call LLM and parse JSON response
  - `call_llm_for_text()` — call LLM and return raw text
  - `LLMConfig` — model names, token limits, temperatures
  - Automatic retry with exponential backoff for 529 (overloaded) errors
  - JSON repair for truncated responses
- **ai/prompts/** contains system prompts for Claude, organized by purpose: `participants.py` (Phase 1), `events.py` (Phase 2), `translation.py`, `clause_merge.py`, `rehearsal.py`.
- **ai/schemas/** contains data schemas like `TRIPOD_SCHEMA` and `TARGET_LANGUAGES`.
- **ai/context_builders.py** contains functions that format passage data for prompts.
- Services import from `app.ai` rather than defining prompts inline or calling LLM SDKs directly.

**Examples:**

- ✅ **Good:** `from app.ai import call_llm_for_json, build_participants_system_prompt`
- ❌ **Bad:** `import anthropic` and calling `anthropic.AsyncAnthropic()` directly in services.
- ✅ **Good:** `result = await call_llm_for_json(system_prompt, user_prompt, model=LLMConfig.MODEL_OPUS)`
- ❌ **Bad:** Creating LLM client instances manually in each service function.
- ✅ **Good:** Adding a new prompt? Create `ai/prompts/new_task.py` and export from `ai/prompts/__init__.py`.
- ❌ **Bad:** Defining prompts in multiple service files or duplicating prompt logic.

### Services, core, models

- **services/**  
  Business logic and data access. Can be **functional** (e.g. `bhsa_service`: `get_bhsa_service()`, `parse_reference()`, `extract_passage()`) or **class-based** when a module has many related operations and shared behavior (e.g. `EventService` with static methods). Prefer functional modules where the problem allows it (see root AGENTS.md). **Every public function in the service layer must have a docstring** (see §5).

- **core/**  
  Config, DB connection, auth: `get_db()`, `get_current_approved_user`, `connect_db` / `disconnect_db`, `create_access_token`, `decode_token`, etc. Keep these as **functions**; no need for classes.

- **models/**  
  Pydantic models only (request/response and internal DTOs). Name by purpose: `*Create`, `*Patch`, `*Response`, etc.

Do not add new top-level layers (e.g. "repositories" or "use_cases") unless the repository has already adopted them; keep the existing layering.

---

## 3. API Conventions

- **Routers**: One router per domain (e.g. `passages`, `events`, `participants`, `auth`). Register in `main.py` with a consistent prefix (e.g. `/api/...`).
- **Auth**: Use `Depends(get_current_approved_user)` for protected routes. Use the same middleware/helpers as in `core/auth_middleware.py`; do not add a second auth mechanism.
- **Errors**: Raise `HTTPException` with appropriate status codes. Do not return error payloads from services; let the API layer translate exceptions to HTTP.
- **IDs**: Use string IDs (UUIDs) as in the current Prisma schema; keep path params and request bodies consistent with existing APIs.

**Examples:**

- ✅ **Good:** Protected route: `async def create_passage(passage: PassageCreate, current_user: dict = Depends(get_current_approved_user)): return await passages_service.create(passage, current_user)`; auth and delegation only.
- ❌ **Bad:** Route that checks `current_user.get("roles")` and branches; move permission logic into a service or core function.
- ✅ **Good:** On service error: `try: return await Service.get(id); except ValueError: raise HTTPException(404, "Not found")`.
- ❌ **Bad:** Service that returns `{"error": "..."}`; services should raise or return domain data; the API layer turns failures into HTTP.

### Exceptions: business logic vs default behavior

- **Raise specific exceptions** when errors happen. For **errors related to business logic** (domain or application rules), use **specific exception types** so the API layer can map them to the right HTTP status and message (e.g. “passage not found” → 404, “invalid reference” → 400, “not authorized” → 403). Prefer built-in types where they fit (`ValueError`, `LookupError`) or small, domain-specific exception classes (e.g. `PassageNotFoundError`, `InvalidReferenceError`) so callers can catch and translate them in the API layer.
- **For other kinds of errors** (infrastructure, database connection, unexpected failures, third-party API errors), **follow the default behavior**: do not wrap them in custom business exceptions. Let them propagate or handle them at the boundary (e.g. FastAPI’s default exception handling, or a single top-level handler that returns 500). Do not invent specific exception types for every infrastructure failure; use the default behavior so that unexpected errors are logged and surfaced consistently.

**Examples:**

- ✅ **Good:** Business rule violated (e.g. passage not found, invalid reference): service raises `ValueError("Passage not found")` or a specific `PassageNotFoundError`; API layer catches it and raises `HTTPException(404, "Passage not found")`.
- ❌ **Bad:** Service raises a generic `Exception("Something went wrong")` for a business case like “passage not found”; use a specific type so the API can map to 404.
- ✅ **Good:** DB connection failure or unexpected error: let it propagate; FastAPI or a global handler returns 500. No custom exception type for “database unavailable.”
- ❌ **Bad:** Wrapping every infrastructure error in a custom `InfrastructureError` or business exception; for non-business errors, follow the default behavior.
- ✅ **Good:** API route: `try: return await Service.get(id); except ValueError as e: raise HTTPException(404, str(e))` for business logic; let other exceptions bubble up for default handling.
- ❌ **Bad:** Catching `Exception` and always returning the same HTTP status; catch only the specific business exceptions and map them; let the rest use the default behavior.

---

## 4. Database and Prisma

- **Client**: Use the single Prisma client from `app.core.database`: `get_db()` or `db`. Do not create additional Prisma instances.
- **Async**: Use async Prisma APIs (`await db.model.find_many(...)`). Do not use sync Prisma in request handlers.
- **Migrations**: Every change to the Prisma schema or to tables must be persisted with a migration. After editing `schema.prisma`, generate a migration (e.g. `prisma migrate dev --name <description>`) so that the change is recorded under `prisma/migrations/` and applied to the database. Do not leave schema or table changes without generating and applying a migration; do not hand-edit the database schema outside Prisma.
- **JSON fields**: Use `prisma.Json` for JSON columns (e.g. list fields) when creating/updating records.

**Examples:**

- ✅ **Good:** In a service: `db = get_db()` or `from app.core.database import db` then `await db.event.find_many(...)`.
- ❌ **Bad:** Creating a new `Prisma()` instance in a router or service; use the single shared client.
- ✅ **Good:** All Prisma calls in request-handling code are `await db.*`; no sync `db.*` in handlers.
- ❌ **Bad:** Sync Prisma in an async route; use async only.
- ✅ **Good:** After adding a field or model to `schema.prisma`, run `prisma migrate dev --name add_foo` (or the project’s command) so a new migration is created and applied; schema and database stay in sync.
- ❌ **Bad:** Editing `schema.prisma` and not generating a migration; or applying schema changes manually to the DB without a migration file.

---

## 5. Code Style (Backend-Specific)

### Prefer async operations; use a clear async structure

- **Whenever possible, use async operations** in the backend to avoid blocking. Request handlers, service functions that do I/O (database, HTTP, file), and any code that waits on external resources should be `async def` and use `await` for I/O. This keeps the event loop free and handles concurrent operations better.
- **Use a consistent async structure:** Route handlers are `async def`; they `await` service calls. Service functions that perform I/O (Prisma, httpx, etc.) are `async def` and `await` those operations. Do not mix sync blocking calls (e.g. sync `requests.get`, sync file I/O) in async handlers; use async equivalents (e.g. `httpx`, async Prisma) so that the backend does not block under load.
- **Structure for operations:** Prefer a single, clear flow: async route → await service → await db/HTTP; avoid nested sync calls inside async code. If you must call a sync library, run it in a thread pool (e.g. `asyncio.to_thread`) so it does not block the event loop.

**Examples:**

- ✅ **Good:** Route `async def list_events(passage_id: str): return await EventService.get_by_passage(passage_id)`; service `async def get_by_passage(passage_id: str): ...; return await db.event.find_many(...)`; all I/O is awaited.
- ❌ **Bad:** Route or service that uses sync `requests.get` or sync file read inside an `async def`; use `httpx.AsyncClient` or async file APIs so the handler does not block.
- ✅ **Good:** All Prisma calls in request-handling code use `await db.*`; all HTTP calls to external APIs use an async client (e.g. `httpx.AsyncClient`) with `await`.
- ❌ **Bad:** Sync Prisma or sync HTTP in an async handler; blocks the event loop and hurts concurrency.
- ✅ **Good:** Clear flow: handler awaits one service call; service awaits db/HTTP; no sync I/O in the path. If a sync library is required, offload it with `asyncio.to_thread(...)`.
- ❌ **Bad:** Mixing sync and async I/O in the same call path without offloading; prefer a consistent async structure so operations are non-blocking.

### Strong typing

- **The backend must be strongly typed.** Use type hints on all public functions (parameters and return type). Use Pydantic for all request and response bodies and for internal DTOs where it helps. Avoid `Any` unless necessary (e.g. Prisma JSON fields or generic passthrough).
- Prefer explicit types for service function returns (e.g. `list[EventResponse]`, `PassageResponse | None`, or a Pydantic model) so that callers and the API layer know the contract.
- **Strongly do not use `dict` for generic typing.** Whenever a structure has a known shape (request body, response body, internal DTO, or nested object), create a **proper type**: a Pydantic model, a `TypedDict`, or a `dataclass`. Use `dict` only when the structure is truly dynamic or opaque (e.g. Prisma JSON columns with arbitrary keys). Prefer named, explicit types so that contracts are clear and tooling can check them.

**Examples:**

- ✅ **Good:** `async def get_by_passage(passage_id: str) -> list[EventResponse]:` with a clear return type; request body as Pydantic model.
- ❌ **Bad:** `def get_by_passage(passage_id):` with no types; or return type `Any` when a concrete type is possible.
- ✅ **Good:** API route handler receives a Pydantic model and returns a Pydantic model or a typed structure; service functions declare return types.
- ❌ **Bad:** Routers or services that take `dict` or `Any` for request/response when a Pydantic model exists.
- ✅ **Good:** Service returns `list[EventResponse]` or a Pydantic model; internal helper returns `PassageData` (Pydantic or TypedDict) with known fields. Create a small type in `app.models` or next to the service when the shape is fixed.
- ❌ **Bad:** `def get_by_passage(passage_id: str) -> list[dict]:` or `def create_event(data: dict) -> dict`; use proper types (e.g. `EventResponse`, `EventCreate`) instead of generic `dict`.
- ✅ **Good:** Nested structure with known keys: define `class EventRole(BaseModel): role: str; participantId: str | None` or a TypedDict; avoid `dict[str, Any]` for fixed shapes.
- ❌ **Bad:** Using `dict` or `dict[str, Any]` for request/response or internal DTOs when the shape is known; create a proper type whenever needed.

### Suggested: dry-python/returns for optional and typed returns

- **Suggested tool:** [dry-python/returns](https://github.com/dry-python/returns) is recommended for better typing around optional values and for composable, typed return values. It helps avoid bare `None` returns and makes “value or absence” and “success or failure” explicit in the type system.
- **Optional values:** Instead of returning `Optional[T]` and forcing callers to check for `None`, you can use **Maybe** (`Some(value)` / `Nothing`). The library lets you compose optional-returning functions without scattered `if x is None` checks; callers use `.bind_optional()` or similar to chain operations. This aligns with the functional style and keeps optional handling typed and explicit.
- **Errors and I/O:** **Result** (`Success(value)` / `Failure(exception)`) lets you return success or failure without raising; **IOResult** and **FutureResult** do the same for impure and async code. Using these (when the dependency is available) keeps errors in the type signature and encourages handling them at the boundary instead of with broad `try/except`.
- **Not mandatory:** The project may not yet have `returns` as a dependency. If it is available, prefer using **Maybe** for optional returns and **Result** (or **FutureResult** for async) for operations that can fail, so that “optional” and “can fail” are expressed in the return type rather than in `None` or exceptions alone.

**Examples (when `returns` is used):**

- ✅ **Good:** Service returns `Maybe[Passage]` (e.g. `Some(passage)` or `Nothing`) instead of `Passage | None`; callers use `.value_or(default)` or `.bind_optional(...)` so optional handling is explicit and composable.
- ✅ **Good:** Function that can fail returns `Result[UserProfile, Exception]` (e.g. `Success(profile)` or `Failure(HTTPError(...))`) instead of raising; API layer unwraps and maps to HTTP response, keeping errors typed.
- ❌ **Bad:** Returning `None` from a service and relying on callers to remember to check; prefer `Maybe` (if using `returns`) or at least a clear `Optional[T]` and consistent handling.
- ❌ **Bad:** Using `returns` in a way that hides errors (e.g. catching all exceptions and returning `Failure` without re-raising or logging where appropriate); use Result for explicit error handling, not to swallow failures.

### Avoid unnecessary type checks; rely on the layers/libs

- **Do not add redundant runtime type checks** when the type is already guaranteed by the stack. When you type a function with Pydantic models or FastAPI path/query params, those libraries already validate and coerce types; duplicating that with manual `isinstance(...)` or `if not isinstance(...): raise` is unnecessary.
- **Rely on:** Pydantic for request/response bodies (validation and parsing happen automatically); FastAPI for path/query parameters (typed params are validated); type hints for static checking and for documenting the contract. Only add runtime type checks when they are actually needed (e.g. data from an external source that is not validated by Pydantic, or a business rule that goes beyond “is this the right type”).
- **Take advantage of the layers:** Once a value has passed through a Pydantic model or a typed FastAPI dependency, you can assume the type; no need to check again inside the service.

**Examples:**

- ✅ **Good:** Route receives `passage: PassageCreate` (Pydantic); service receives the same model. No `if not isinstance(passage.reference, str)` or `if passage.reference is None` when the schema already enforces `reference: str`; use `passage.reference` directly.
- ❌ **Bad:** After parsing a request body with Pydantic, adding `if not isinstance(data.get("reference"), str): raise HTTPException(400, "reference must be string")`; Pydantic already ensured the type.
- ✅ **Good:** Path param `passage_id: str` in the route; service receives `passage_id: str`. No `if isinstance(passage_id, str)` inside the service; FastAPI already validated the path.
- ❌ **Bad:** Manual checks like `if type(x) != str` or `if x is None` for fields that are required and typed in the Pydantic model; the library already did the check.
- ✅ **Good:** Runtime check only when necessary: e.g. parsing raw JSON from an external API or user input that has not gone through a Pydantic model; then validate once and use the validated object.
- ❌ **Bad:** Defensive `isinstance` at every layer for values that came from a typed route or a Pydantic model; trust the layer that already validated.

### Docstrings in the service layer

- **Every public function in the service layer must have a docstring.** The docstring should describe what the function does (purpose), its parameters, what it returns, and, if relevant, what it raises. This is the one place in the backend where we require documentation: service functions define the contract for the API layer and for future readers.
- Use a consistent style (e.g. one-line summary, then “Args:”, “Returns:”, “Raises:” if needed). Keep docstrings concise; they document the contract, not the implementation step-by-step.

**Examples:**

- ✅ **Good:** Service function with docstring: `def get_by_passage(passage_id: str) -> list[dict]:` followed by `"""Return all events for a passage, with related data, ordered by event id."""` or a short multi-line docstring with Args/Returns.
- ❌ **Bad:** Public service function with no docstring; add a docstring for every public function in `app/services/`.
- ✅ **Good:** Docstring describes purpose and contract: “Create an event and its nested relations. Raises ValueError if passage_id is invalid.”
- ❌ **Bad:** Docstring that only restates the name: “Gets events by passage.” Prefer a sentence that adds purpose or contract.

### Centralized configuration

- **Use `core/config.py` for all environment variables**: API keys, database URLs, and other configuration must be defined in the `Settings` class and accessed via `get_settings()`. Do not use `os.getenv()` directly in services or other modules.
- **Validate at startup**: Required configuration should be validated when the app starts. Optional configuration (like API keys for optional features) can have empty string defaults.
- **Import settings, not os.getenv**: Services should `from app.core.config import get_settings` and access `settings.anthropic_api_key`, not `os.getenv("ANTHROPIC_API_KEY")`.

**Examples:**

- ✅ **Good:** `settings = get_settings(); client = Anthropic(api_key=settings.anthropic_api_key)`
- ❌ **Bad:** `api_key = os.getenv("ANTHROPIC_API_KEY")` scattered throughout services.
- ✅ **Good:** All API keys defined once in `Settings` class in `core/config.py`.
- ❌ **Bad:** Multiple `os.getenv()` calls for the same variable in different files.
- ✅ **Good:** Config validated at startup; missing required config fails fast.
- ❌ **Bad:** `api_key or os.getenv("...")` pattern that defers validation until runtime.
- ✅ **Good:** Service function accesses config internally: `api_key = get_settings().anthropic_api_key`
- ❌ **Bad:** Passing config values as function parameters: `def analyze(api_key: str = None)` — services should access config directly, not receive it as parameters.

### Dependency injection for database

- **Inject database as a parameter**: Service functions should receive `db: Prisma` as a parameter rather than calling `get_db()` internally. The API layer uses FastAPI's `Depends(get_db)` and passes the db instance to services.
- **Why**: This follows dependency inversion principle, makes functions testable (can mock db), and makes dependencies explicit.

**Examples:**

- ✅ **Good:** `async def get_events(db: Prisma, passage_id: str) -> list[Event]:` — db is injected
- ❌ **Bad:** `async def get_events(passage_id: str):` with `db = get_db()` inside — implicit dependency
- ✅ **Good:** API route: `async def get_events(passage_id: str, db: Prisma = Depends(get_db)):` then calls `service.get_events(db, passage_id)`
- ❌ **Bad:** Service function that internally instantiates or fetches its own database connection

### Other style

- **Functional preference**: Prefer functions and composition. Use classes in services only when the module is large and clearly benefits from grouped static methods (as in existing `EventService`).
- **No inline comments for “what”**: Code and names should be self-explanatory. Inline comments only for non-obvious “why” (see root AGENTS.md). Docstrings in services are the exception: they are required.
- **No module-level docstrings**: Do not add `"""Module description"""` at the top of files. The file name and location convey purpose; module docstrings are redundant.
- **Naming**: Use `snake_case` for Python. Match Prisma field names in the schema (e.g. `passageId`, `eventId` in Prisma stay as-is in Pydantic where they mirror the API).
- **App creation**: Keep `create_app()` as a pure function that returns a FastAPI app; register routers and middleware there. Lifespan (startup/shutdown) is handled in a single `lifespan` context manager.

---

## 6. Summary Checklist (Backend)

**Quick decision reference:**

- **API layer:** Prefer only access: parse request → call one service → return response. Avoid any logic, Prisma, or business rules in **api/**; the API folder is only an access layer for the frontend.
- **Stack:** Prefer only FastAPI, Prisma, Pydantic, existing auth. Avoid a different ORM, framework, or auth library.
- **Layering:** Prefer thin **api/** and logic in **services/** or **core/**. Avoid putting logic or DB access in the API layer.
- **Database:** Prefer single `get_db()` / `db`, async only, Prisma migrations. After every schema/table change, generate a migration to persist it. Avoid extra Prisma instances, sync Prisma in handlers, or schema changes without a migration.
- **Async:** Prefer async operations everywhere (async def, await for I/O); use a clear async structure so the backend does not block. Avoid sync I/O (sync Prisma, sync HTTP, sync file) in request-handling code.
- **Typing:** Prefer strong typing: type hints on all public functions, Pydantic for request/response. Avoid `Any` or untyped signatures when a concrete type is possible.
- **No generic dict:** Strongly avoid `dict` for generic typing; create proper types (Pydantic, TypedDict, dataclass) whenever the structure is known. Use `dict` only for truly dynamic/opaque data (e.g. Prisma JSON columns).
- **Optional / error returns:** When the dependency is available, prefer [dry-python/returns](https://github.com/dry-python/returns) (Maybe for optional, Result/FutureResult for can-fail) so optional and error cases are typed and composable; avoid bare `None` returns and untyped exceptions where a typed return is clearer.
- **Type checks:** Prefer relying on Pydantic and FastAPI to validate types; avoid unnecessary `isinstance` or manual checks for values that already passed through those layers.
- **Docstrings:** Prefer a docstring on every public function in **services/** (purpose, args, returns, raises). Avoid leaving service functions undocumented.
- **Routers:** Prefer one router per domain, registered in `main.py` with the same prefix pattern. Avoid second auth mechanism or error payloads from services.
- **Exceptions:** Prefer specific exceptions for business-logic errors (e.g. ValueError, domain-specific); API layer maps them to HTTP. For other errors (infrastructure, unexpected), follow the default behavior (let them propagate or handle at boundary); do not wrap in custom business exceptions.

- [ ] Follow root [AGENTS.md](../AGENTS.md) (functional preference, no “what” comments, clean architecture, no commit unless asked, semantic commits, build/run in Docker).
- [ ] Use only the stack above: FastAPI, Prisma, Pydantic, existing auth.
- [ ] Keep **api/** as access only: no logic, no Prisma; only call a service that represents the operation. **api/** is only the access layer to the frontend.
- [ ] Put all business logic and data access in **services/** (or **core/** for config/auth/db).
- [ ] Use `get_db()` / `db` and async Prisma only; one Prisma client.
- [ ] After every change to the Prisma schema or tables, generate a migration to persist it; do not leave schema changes without a migration.
- [ ] Prefer async operations throughout (async def, await for I/O); use a clear async structure so the backend does not block; avoid sync I/O in request-handling code.
- [ ] Keep the backend strongly typed: type hints on all public functions, Pydantic for request/response; avoid `Any` when a concrete type is possible.
- [ ] Do not use `dict` for generic typing; create proper types (Pydantic, TypedDict, dataclass) whenever the structure is known; use `dict` only for truly dynamic data.
- [ ] When `returns` is available, prefer Maybe for optional returns and Result/FutureResult for can-fail operations so optional and error handling are typed and composable; avoid bare `None` returns where a typed optional is clearer.
- [ ] Avoid unnecessary type checks: rely on Pydantic and FastAPI to validate types; do not add redundant `isinstance` or manual checks for values that already passed through those layers.
- [ ] Add a docstring to every public function in the service layer (purpose, parameters, returns, raises if relevant).
- [ ] Use `get_settings()` from `core/config.py` for all configuration; do not use `os.getenv()` in services.
- [ ] Prefer functional services; use class-based services only when it matches existing patterns (e.g. EventService).
- [ ] Register new routers in `main.py` with the same prefix/pattern as existing ones.
- [ ] Raise specific exceptions for business-logic errors (e.g. ValueError, domain-specific); let the API layer map them to HTTP. For other errors (infrastructure, unexpected), follow the default behavior; do not wrap in custom business exceptions.
