/* Використовуємо вбудований модуль */
const { createServer } = require("node:http");
// Тув ваш варіант даних, залежно від варіанта.
let INVENTORY = [
    {
	id: 1,
	name: "Monitor",
	price: 500,
	qty: 10,
    },
    { id: 2, name: "Keyboard", price: 50, qty: 30 },
    { id: 3, name: "Headphones", price: 75, qty: 20 },
];

const config = require('./config');

function log({ level, method = null, url = null, status = null, message }) {
    const logEntry = {
	timestamp: new Date().toISOString(),
	level,
	method,
	url,
	status,
	message,
    };

    const json = JSON.stringify(logEntry);

    if (level === "ERROR") {
	process.stderr.write(json + "\n");
    } else {
	process.stdout.write(json + "\n");
    }
}

let isShuttingDown = false;

function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    server.close((err) => {
	if (err) {
	    console.error("Error during server close:", err);
	    process.exit(1);
	}

	console.log("Server closed successfully");
	process.exit(0);
    });

    setTimeout(() => {
	console.error("Force shutdown after timeout");
	process.exit(1);
    }, 10000);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

process.on("uncaughtException", (err) => {
  log({
    level: "ERROR",
    message: err.message,
  });

  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (err) => {
  log({
    level: "ERROR",
    message: err?.message || "Unhandled rejection",
  });

  gracefulShutdown("unhandledRejection");
});

const server = createServer((req, res) => {
    // LOGGING
    res.on("finish", () => {
	const { method, url } = req;
	const { statusCode } = res;

	let level = "INFO";
	if (statusCode >= 400) {
	    level = "ERROR";
	}

	if (config.NODE_ENV === "development") {
	    log({level, method, url, status: statusCode});
	}

	if (config.NODE_ENV === "production") {
	    if (level === "ERROR") {
		log({level, method, url, status: statusCode});
	    }
	}
    });

    const method = req.method;
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // GET products
    if (method === "GET" && pathname === "/products") {
	const minPriceParam = parsedUrl.searchParams.get("minPrice");
	const minPrice = minPriceParam ? parseFloat(minPriceParam) : 0;

	let results = [...INVENTORY];

	if (!isNaN(minPrice) && minPrice > 0) {
            results = results.filter(product => product.price >= minPrice);
	}

	res.statusCode = 200;
	return res.end(
            JSON.stringify({
		count: results.length,
		items: results,
            }),
	);
    }

    // GET health
    if (req.method === "GET" && req.url === "/health") {
	const data = {
	    pid: process.pid,
	    nodeVersion: process.version,
	    platform: process.platform,
	    uptime: process.uptime(),
	    memoryUsage: process.memoryUsage(),
	};

	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(JSON.stringify(data));
	return;
    }


    // POST
    if (method === "POST" && pathname === "/products") {
	let body = "";
	req.on("data", (chunk) => {
            body += chunk.toString();
	});

	req.on("end", () => {
            try {
		const data = JSON.parse(body);

		if (!data.name || !data.price || data.qty === undefined) {
                    res.statusCode = 400;
                    return res.end(
			JSON.stringify({ error: "Name, Price and Qty are required" })
                    );
		}

		const lastId = INVENTORY.length > 0 ? INVENTORY[INVENTORY.length - 1].id : 0;
		const nextId = lastId + 1;

		const productToSave = {
                    id: nextId,
                    name: data.name,
                    price: data.price,
                    qty: data.qty,
		};

		INVENTORY.push(productToSave);

		res.statusCode = 201;
		res.end(JSON.stringify({ message: "Product added", product: productToSave }));
            } catch (err) {
		res.statusCode = 400;
		res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
	});
	return;
    } 

    // PATCH
    if (method === "PATCH" && pathname.startsWith("/products/")) {
	const id = parseInt(pathname.split("/")[2]);
	let body = "";
	req.on("data", (chunk) => {
	    body += chunk.toString();
	});
	req.on("end", () => {
	    const index = INVENTORY.findIndex((p) => p.id === id);
	    if (index !== -1) {
		const updates = JSON.parse(body);
		INVENTORY[index] = { ...INVENTORY[index], ...updates };
		res.statusCode = 200;
		res.end(JSON.stringify({ message: "Updated", product: INVENTORY[index] }));
	    } else {
		res.statusCode = 404;
		res.end(JSON.stringify({ error: "Not Found" }));
	    }
	});
	return;
    }
    
    // DELETE
    if (method === "DELETE" && pathname.startsWith("/products/")) {
	const id = parseInt(pathname.split("/")[2]);
	const originalLength = INVENTORY.length;
	INVENTORY = INVENTORY.filter((product) => product.id !== id);


	if (INVENTORY.length < originalLength) {
	    res.statusCode = 200;
	    res.end(JSON.stringify({ message: "Deleted" }));
	} else {
	    res.statusCode = 404;
	    res.end(JSON.stringify({ error: "Not Found" }));
	}
	return;
    }


    // 404
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Route not found" }));
});
// Ми повинні вивести логи що сервер успішно запустився.
server.listen(config.PORT, config.HOSTNAME, () => {
    console.log(`Server running at http://${config.HOSTNAME}:${config.PORT}/`);
});

