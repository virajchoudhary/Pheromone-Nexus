import time, math, random, os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.get("/")
def read_root():
    return {"message": "Pheromone Nexus API is running", "status": "active"}


class City(BaseModel):
    x: float
    y: float


class RunRequest(BaseModel):
    cities: List[City]
    m: int = 20
    iterations: int = 100
    alpha: float = 1.0
    beta: float = 2.0
    rho: float = 0.5
    Q: float = 1.0
    e: float = 3.0
    w: int = 6
    seed: int = 0


def euclidean(c1, c2):
    return math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2)


def build_dist_matrix(cities):
    n = len(cities)
    d = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                d[i][j] = euclidean(cities[i], cities[j])
    return d


def nearest_neighbor_tour_length(dist, n):
    visited = [False] * n
    cur, total = 0, 0.0
    visited[0] = True
    for _ in range(n - 1):
        best, best_d = -1, float('inf')
        for j in range(n):
            if not visited[j] and dist[cur][j] < best_d:
                best, best_d = j, dist[cur][j]
        total += best_d
        cur = best
        visited[best] = True
    total += dist[cur][0]
    return total


def construct_tour(pheromone, dist, n, alpha, beta):
    # roulette-wheel construction starting from random city
    start = random.randint(0, n - 1)
    visited = [False] * n
    tour = [start]
    visited[start] = True
    for _ in range(n - 1):
        cur = tour[-1]
        probs = []
        total = 0.0
        for j in range(n):
            if not visited[j]:
                d = dist[cur][j] if dist[cur][j] > 0 else 1e-10
                p = (pheromone[cur][j] ** alpha) * ((1.0 / d) ** beta)
                probs.append((j, p))
                total += p
        if total <= 0:
            chosen = probs[0][0]
        else:
            r = random.random() * total
            cumul = 0.0
            chosen = probs[-1][0]
            for j, p in probs:
                cumul += p
                if cumul >= r:
                    chosen = j
                    break
        tour.append(chosen)
        visited[chosen] = True
    return tour


def tour_length(tour, dist):
    n = len(tour)
    return sum(dist[tour[i]][tour[(i + 1) % n]] for i in range(n))


def pack_result(best_tour, best_len, convergence, t0, pheromone, n, iterations):
    first_it = iterations
    for c in convergence:
        if c["cost"] == round(best_len, 4):
            first_it = c["iteration"]
            break
    return {
        "best_tour": best_tour,
        "best_cost": round(best_len, 4),
        "convergence": convergence,
        "time_ms": round((time.time() - t0) * 1000, 2),
        "pheromone": [[round(pheromone[i][j], 6) for j in range(n)] for i in range(n)],
        "pheromone_initial": round(1.0 / (n * max(nearest_neighbor_tour_length(build_dist_matrix([(0,0)]*n) if n<2 else pheromone, n), 1)), 10) if False else None,
        "found_at_iteration": first_it,
    }


def run_as(req: RunRequest):
    if req.seed:
        random.seed(req.seed)
    cities = [(c.x, c.y) for c in req.cities]
    n = len(cities)
    dist = build_dist_matrix(cities)
    L_nn = nearest_neighbor_tour_length(dist, n)
    tau0 = 1.0 / (n * max(L_nn, 1e-10))
    pheromone = [[tau0] * n for _ in range(n)]
    best_tour, best_len = None, float('inf')
    convergence = []
    t0 = time.time()
    for it in range(req.iterations):
        tours = [construct_tour(pheromone, dist, n, req.alpha, req.beta) for _ in range(req.m)]
        lengths = [tour_length(t, dist) for t in tours]
        for i in range(n):
            for j in range(n):
                pheromone[i][j] *= (1 - req.rho)
        for t, L in zip(tours, lengths):
            delta = req.Q / L
            for s in range(n):
                a, b = t[s], t[(s + 1) % n]
                pheromone[a][b] += delta
                pheromone[b][a] += delta
        min_idx = lengths.index(min(lengths))
        if lengths[min_idx] < best_len:
            best_len = lengths[min_idx]
            best_tour = tours[min_idx][:]
        convergence.append({"iteration": it + 1, "cost": round(best_len, 4)})
    first_it = next((c["iteration"] for c in convergence if c["cost"] == round(best_len, 4)), req.iterations)
    return {
        "best_tour": best_tour,
        "best_cost": round(best_len, 4),
        "convergence": convergence,
        "time_ms": round((time.time() - t0) * 1000, 2),
        "pheromone": [[round(pheromone[i][j], 6) for j in range(n)] for i in range(n)],
        "pheromone_initial": round(tau0, 10),
        "found_at_iteration": first_it,
    }


def run_eas(req: RunRequest):
    if req.seed:
        random.seed(req.seed)
    cities = [(c.x, c.y) for c in req.cities]
    n = len(cities)
    dist = build_dist_matrix(cities)
    L_nn = nearest_neighbor_tour_length(dist, n)
    tau0 = 1.0 / (n * max(L_nn, 1e-10))
    pheromone = [[tau0] * n for _ in range(n)]
    best_tour, best_len = None, float('inf')
    convergence = []
    t0 = time.time()
    for it in range(req.iterations):
        tours = [construct_tour(pheromone, dist, n, req.alpha, req.beta) for _ in range(req.m)]
        lengths = [tour_length(t, dist) for t in tours]
        for i in range(n):
            for j in range(n):
                pheromone[i][j] *= (1 - req.rho)
        for t, L in zip(tours, lengths):
            delta = req.Q / L
            for s in range(n):
                a, b = t[s], t[(s + 1) % n]
                pheromone[a][b] += delta
                pheromone[b][a] += delta
        min_idx = lengths.index(min(lengths))
        if lengths[min_idx] < best_len:
            best_len = lengths[min_idx]
            best_tour = tours[min_idx][:]
        if best_tour is not None:
            elite = req.e * (req.Q / best_len)
            for s in range(n):
                a, b = best_tour[s], best_tour[(s + 1) % n]
                pheromone[a][b] += elite
                pheromone[b][a] += elite
        convergence.append({"iteration": it + 1, "cost": round(best_len, 4)})
    first_it = next((c["iteration"] for c in convergence if c["cost"] == round(best_len, 4)), req.iterations)
    return {
        "best_tour": best_tour,
        "best_cost": round(best_len, 4),
        "convergence": convergence,
        "time_ms": round((time.time() - t0) * 1000, 2),
        "pheromone": [[round(pheromone[i][j], 6) for j in range(n)] for i in range(n)],
        "pheromone_initial": round(tau0, 10),
        "found_at_iteration": first_it,
    }


def run_asrank(req: RunRequest):
    if req.seed:
        random.seed(req.seed)
    cities = [(c.x, c.y) for c in req.cities]
    n = len(cities)
    dist = build_dist_matrix(cities)
    L_nn = nearest_neighbor_tour_length(dist, n)
    tau0 = 1.0 / (n * max(L_nn, 1e-10))
    pheromone = [[tau0] * n for _ in range(n)]
    best_tour, best_len = None, float('inf')
    convergence = []
    t0 = time.time()
    for it in range(req.iterations):
        tours = [construct_tour(pheromone, dist, n, req.alpha, req.beta) for _ in range(req.m)]
        lengths = [tour_length(t, dist) for t in tours]
        ranked = sorted(zip(lengths, tours), key=lambda x: x[0])
        for i in range(n):
            for j in range(n):
                pheromone[i][j] *= (1 - req.rho)
        # top (w-1) ranked ants
        for r, (L, t) in enumerate(ranked[:req.w - 1], start=1):
            weight = max(0, req.w - r)
            if weight == 0:
                continue
            delta = weight * (req.Q / L)
            for s in range(n):
                a, b = t[s], t[(s + 1) % n]
                pheromone[a][b] += delta
                pheromone[b][a] += delta
        # best-so-far
        if ranked[0][0] < best_len:
            best_len = ranked[0][0]
            best_tour = ranked[0][1][:]
        if best_tour is not None:
            delta_bs = req.w * (req.Q / best_len)
            for s in range(n):
                a, b = best_tour[s], best_tour[(s + 1) % n]
                pheromone[a][b] += delta_bs
                pheromone[b][a] += delta_bs
        convergence.append({"iteration": it + 1, "cost": round(best_len, 4)})
    first_it = next((c["iteration"] for c in convergence if c["cost"] == round(best_len, 4)), req.iterations)
    return {
        "best_tour": best_tour,
        "best_cost": round(best_len, 4),
        "convergence": convergence,
        "time_ms": round((time.time() - t0) * 1000, 2),
        "pheromone": [[round(pheromone[i][j], 6) for j in range(n)] for i in range(n)],
        "pheromone_initial": round(tau0, 10),
        "found_at_iteration": first_it,
    }


@app.post("/run/as")
def run_as_endpoint(req: RunRequest):
    return run_as(req)


@app.post("/run/eas")
def run_eas_endpoint(req: RunRequest):
    return run_eas(req)


@app.post("/run/asrank")
def run_asrank_endpoint(req: RunRequest):
    return run_asrank(req)


@app.post("/run/all")
def run_all(req: RunRequest):
    return {"as": run_as(req), "eas": run_eas(req), "asrank": run_asrank(req)}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
