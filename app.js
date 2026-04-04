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


const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";


const server = createServer((req, res) => {
    const method = req.method;
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;


    res.setHeader("Content-Type", "application/json; charset=utf-8");


    // GET
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
server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});

