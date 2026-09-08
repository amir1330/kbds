use axum::{routing::{get, post}, Router, Json, extract::State};
use sqlx::PgPool;
use std::{net::SocketAddr, sync::Arc};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

#[derive(Clone)] struct App{ pool: PgPool }

#[tokio::main] async fn main(){
    dotenvy::dotenv().ok(); tracing_subscriber::fmt::init();
    let url=std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool=PgPool::connect(&url).await.unwrap();
    sqlx::migrate!("../migrations").run(&pool).await.ok();
    let app=Router::new()
        .route("/api/health", get(|| async { Json(serde_json::json!({"status":"ok"})) }))
        .route("/api/products", get(list_products).post(create_product))
        .route("/api/keyboards", get(list_keyboards).post(create_keyboard))
        .route("/api/cart", get(cart_get).post(cart_post))
        .route("/api/orders", get(list_orders).post(create_order))
        .route("/api/contact", post(create_contact))
        .route("/api/build_requests", get(list_build).post(create_build))
        .layer(CorsLayer::permissive()).layer(TraceLayer::new_for_http()).with_state(Arc::new(App{pool}));
    let addr=SocketAddr::from(([0,0,0,0], std::env::var("PORT").ok().and_then(|p|p.parse().ok()).unwrap_or(8000)));
    tracing::info!("listening {addr}"); let l=tokio::net::TcpListener::bind(addr).await.unwrap(); axum::serve(l, app).await.unwrap();
}
async fn list_products(State(a):State<Arc<App>>)-> Json<serde_json::Value>{
    let rows=sqlx::query_scalar::<_, serde_json::Value>("SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM product ORDER BY created_at DESC) t").fetch_one(&a.pool).await.ok().flatten().unwrap_or(serde_json::json!([]));
    Json(rows)
}
async fn create_product(State(a):State<Arc<App>>, Json(b):Json<serde_json::Value>)-> Json<serde_json::Value>{
    let r=sqlx::query("INSERT INTO product (slug,name,tagline,description,price_cents,switches,microcontroller) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id")
        .bind(b["slug"].as_str().unwrap_or("")).bind(b["name"].as_str().unwrap_or("")).bind(b["tagline"].as_str().unwrap_or("")).bind(b["description"].as_str().unwrap_or(""))
        .bind(b["price_cents"].as_i64().unwrap_or(0) as i32).bind(b["switches"].as_str().unwrap_or("")).bind(b["microcontroller"].as_str().unwrap_or(""))
        .fetch_one(&a.pool).await;
    Json(serde_json::json!({"status": if r.is_ok(){"ok"}else{"error"}}))
}
async fn list_keyboards(State(a):State<Arc<App>>)-> Json<serde_json::Value>{
    let rows=sqlx::query_scalar::<_, serde_json::Value>("SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM keyboard ORDER BY created_at DESC) t").fetch_one(&a.pool).await.ok().flatten().unwrap_or(serde_json::json!([]));
    Json(rows)
}
async fn create_keyboard(State(a):State<Arc<App>>, Json(b):Json<serde_json::Value>)-> Json<serde_json::Value>{
    let _=sqlx::query("INSERT INTO keyboard (name,slug,tagline,short_description,description,price_cents) VALUES ($1,$2,$3,$4,$5,$6)")
        .bind(b["name"].as_str().unwrap_or("")).bind(b["slug"].as_str().unwrap_or("")).bind(b["tagline"].as_str().unwrap_or("")).bind(b["short_description"].as_str().unwrap_or("")).bind(b["description"].as_str().unwrap_or("")).bind(b["price_cents"].as_i64().unwrap_or(0) as i32)
        .execute(&a.pool).await;
    Json(serde_json::json!({"status":"ok"}))
}
async fn cart_get()-> Json<serde_json::Value>{ Json(serde_json::json!([])) } // materialized view or DB JSON instead of Redis
async fn cart_post(Json(b):Json<serde_json::Value>)-> Json<serde_json::Value>{ Json(b) }
async fn list_orders(State(a):State<Arc<App>>)-> Json<serde_json::Value>{
    let rows=sqlx::query_scalar::<_, serde_json::Value>("SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM \"order\" ORDER BY created_at DESC) t").fetch_one(&a.pool).await.ok().flatten().unwrap_or(serde_json::json!([]));
    Json(rows)
}
async fn create_order(State(a):State<Arc<App>>, Json(b):Json<serde_json::Value>)-> Json<serde_json::Value>{
    let _=sqlx::query("INSERT INTO \"order\" (email,name,items_json,total_cents) VALUES ($1,$2,$3,$4)")
        .bind(b["email"].as_str().unwrap_or("")).bind(b["name"].as_str().unwrap_or("")).bind(b["items_json"].clone()).bind(b["total_cents"].as_i64().unwrap_or(0) as i32)
        .execute(&a.pool).await;
    Json(serde_json::json!({"status":"ok"}))
}
async fn create_contact(State(a):State<Arc<App>>, Json(b):Json<serde_json::Value>)-> Json<serde_json::Value>{
    let _=sqlx::query("INSERT INTO contactsubmission (name,email,message) VALUES ($1,$2,$3)").bind(b["name"].as_str().unwrap_or("")).bind(b["email"].as_str().unwrap_or("")).bind(b["message"].as_str().unwrap_or("")).execute(&a.pool).await;
    Json(serde_json::json!({"status":"ok"}))
}
async fn list_build(State(a):State<Arc<App>>)-> Json<serde_json::Value>{
    let rows=sqlx::query_scalar::<_, serde_json::Value>("SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM buildrequest ORDER BY created_at DESC) t").fetch_one(&a.pool).await.ok().flatten().unwrap_or(serde_json::json!([]));
    Json(rows)
}
async fn create_build(State(a):State<Arc<App>>, Json(b):Json<serde_json::Value>)-> Json<serde_json::Value>{
    let _=sqlx::query("INSERT INTO buildrequest (name,email,description,layout_json,plate_spec_json) VALUES ($1,$2,$3,$4,$5)")
        .bind(b["name"].as_str().unwrap_or("")).bind(b["email"].as_str().unwrap_or("")).bind(b["description"].as_str().unwrap_or("")).bind(b["layout_json"].clone()).bind(b["plate_spec_json"].clone())
        .execute(&a.pool).await;
    Json(serde_json::json!({"status":"ok"}))
}
