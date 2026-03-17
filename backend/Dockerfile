# --- Build stage ---
FROM rust:1.88-bookworm AS builder

WORKDIR /app

# Cache dependency builds by copying manifests first.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && echo '' > src/lib.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# Copy real source and build.
COPY src/ src/
COPY migrations/ migrations/
COPY db/ db/
RUN touch src/main.rs src/lib.rs && cargo build --release

# --- Runtime stage ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash hzel

COPY --from=builder /app/target/release/hzel-backend /usr/local/bin/hzel-backend
COPY migrations/ /app/migrations/

WORKDIR /app
USER hzel

EXPOSE 8081

ENV PORT=8081
ENV RUST_LOG=info,hzel_backend=debug

CMD ["hzel-backend"]

