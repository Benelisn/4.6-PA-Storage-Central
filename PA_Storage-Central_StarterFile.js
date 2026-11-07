/*
    Author: Joshua Farr
    Date: 11/7/2026
    Purpose: Runs the Willow & Pine Crafts storefront. It displays the products,
             manages the cart and stock, and handles checkout. The cart and stock
             are saved in localStorage, items added this session are counted in
             sessionStorage, and the last purchased products are saved in a cookie.
*/

/* =========================================
    PRODUCT DATA
========================================= */

const defaultProducts = [
    {
        id: 1,
        name: "Painted Wave Bookmark",
        description: "Hand-painted bookmark with a bold blue ocean wave.",
        price: 8,
        stock: 6,
        image: "images/bookmark.png",
        alt: "Bookmark painted with a blue and white ocean wave"
    },
    {
        id: 2,
        name: "Soy Jar Candle",
        description: "Hand-poured soy candle in a glass jar with a cotton wick.",
        price: 18,
        stock: 4,
        image: "images/candle.png",
        alt: "Soy candles in glass jars tied with twine"
    },
    {
        id: 3,
        name: "Wood Slice Coasters",
        description: "Set of natural wood slice coasters with the bark left on.",
        price: 22,
        stock: 3,
        image: "images/coasters.png",
        alt: "Round wood slice coasters showing tree rings"
    },
    {
        id: 4,
        name: "Macrame Wall Hanging",
        description: "Knotted cotton rope wall hanging on a wooden dowel.",
        price: 45,
        stock: 2,
        image: "images/macrame.png",
        alt: "White macrame wall hanging on a wooden rod"
    },
    {
        id: 5,
        name: "Pine Tree Camp Mug",
        description: "Enamel camp mug with a hand-stenciled pine tree design.",
        price: 16,
        stock: 5,
        image: "images/mug.png",
        alt: "Black enamel mug with three white pine trees"
    },
    {
        id: 6,
        name: "Hand-Knit Scarf",
        description: "Soft cable-knit scarf made from blue wool yarn.",
        price: 35,
        stock: 1,
        image: "images/scarf.png",
        alt: "Blue cable-knit scarf on knitting needles"
    }
];

/* =========================================
    BROWSER STORAGE
========================================= */

// localStorage: cart contents and stock stay after the browser closes
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let stock = JSON.parse(localStorage.getItem("stock")) || {};

// Fill in starting stock for any product not saved yet
defaultProducts.forEach(product => {
    if (stock[product.id] === undefined) {
        stock[product.id] = product.stock;
    }
});

// sessionStorage: number of items added during this browsing session
let sessionAdds = Number(sessionStorage.getItem("itemsAddedThisSession")) || 0;

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("stock", JSON.stringify(stock));
}

// Cookie: products from the last purchase, kept for 30 days
function setLastPurchasedCookie(names) {
    document.cookie = `lastPurchased=${JSON.stringify(names)}; path=/; max-age=2592000`;
}

function getLastPurchasedCookie() {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith("lastPurchased=")) {
            return JSON.parse(trimmed.substring("lastPurchased=".length));
        }
    }
    return [];
}

/* =========================================
    DOM REFERENCES
========================================= */

const productGrid = document.getElementById("product-grid");
const cartItems = document.getElementById("cart-items");
const cartSummary = document.getElementById("cart-summary");
const cartTotal = document.getElementById("cart-total");
const cartCount = document.getElementById("cart-count");
const cartBadge = document.getElementById("cart-badge");
const checkoutBtn = document.getElementById("checkout-btn");
const clearBtn = document.getElementById("clear-btn");
const notification = document.getElementById("notification");
const welcomeMessage = document.getElementById("welcome-message");
const sessionMessage = document.getElementById("session-message");

// Tooltip that follows the mouse over out-of-stock products
const tooltip = document.createElement("div");
tooltip.classList.add("mouse-tooltip");
tooltip.textContent = "Out of Stock";
document.body.appendChild(tooltip);

/* =========================================
    DISPLAY PRODUCTS
========================================= */

function displayProducts() {
    productGrid.innerHTML = "";

    defaultProducts.forEach(product => {
        const available = stock[product.id];
        const card = document.createElement("article");
        card.classList.add("product-card");

        card.innerHTML = `
            <img src="${product.image}" alt="${product.alt}">
            <section class="product-content">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p class="price">$${product.price.toFixed(2)}</p>
                <p class="stock">Available: ${available}</p>
                <button type="button" ${available === 0 ? "disabled" : ""}
                    aria-label="Add ${product.name} to cart">
                    ${available === 0 ? "Out of Stock" : "Add to Cart"}
                </button>
            </section>
        `;

        card.querySelector("button").addEventListener("click", () => addToCart(product.id));

        // Grey out the card and show the tooltip when stock reaches zero
        if (available === 0) {
            card.classList.add("out-of-stock");

            card.addEventListener("mousemove", event => {
                tooltip.style.left = `${event.clientX + 12}px`;
                tooltip.style.top = `${event.clientY + 12}px`;
                tooltip.classList.add("show");
            });

            card.addEventListener("mouseleave", () => {
                tooltip.classList.remove("show");
            });
        }

        productGrid.appendChild(card);
    });
}

/* =========================================
    CART ACTIONS
========================================= */

function addToCart(id) {
    if (stock[id] <= 0) return;

    const item = cart.find(entry => entry.id === id);
    if (item) {
        item.quantity++;
    } else {
        cart.push({ id: id, quantity: 1 });
    }

    stock[id]--;

    // Count this add in sessionStorage
    sessionAdds++;
    sessionStorage.setItem("itemsAddedThisSession", sessionAdds);

    saveCart();
    updatePage();
    showAddedFeedback(id);
}

function changeQuantity(id, change) {
    const item = cart.find(entry => entry.id === id);
    if (!item) return;

    // Can't add more than what's in stock
    if (change > 0 && stock[id] <= 0) return;

    item.quantity += change;
    stock[id] -= change;

    // Remove the item when its quantity reaches zero
    if (item.quantity <= 0) {
        cart = cart.filter(entry => entry.id !== id);
    }

    saveCart();
    updatePage();
}

function clearCart() {
    // Put every item back in stock
    cart.forEach(item => {
        stock[item.id] += item.quantity;
    });

    cart = [];
    saveCart();
    updatePage();
}

/* =========================================
    CART TOTALS
========================================= */

function getProduct(id) {
    return defaultProducts.find(product => product.id === id);
}

function getCartCount() {
    let count = 0;
    cart.forEach(item => {
        count += item.quantity;
    });
    return count;
}

function getCartTotal() {
    let total = 0;
    cart.forEach(item => {
        total += getProduct(item.id).price * item.quantity;
    });
    return total;
}

/* =========================================
    DISPLAY CART
========================================= */

function displayCart() {
    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<li class=\"empty\">Your cart is empty.</li>";
    }

    cart.forEach(item => {
        const product = getProduct(item.id);
        const li = document.createElement("li");
        li.classList.add("cart-item");

        li.innerHTML = `
            <p class="cart-name">${product.name}</p>
            <p>$${product.price.toFixed(2)} each</p>
            <div class="quantity-controls">
                <button type="button" class="qty-btn" aria-label="Remove one ${product.name}">-</button>
                <span>${item.quantity}</span>
                <button type="button" class="qty-btn" aria-label="Add one more ${product.name}"
                    ${stock[item.id] === 0 ? "disabled" : ""}>+</button>
            </div>
        `;

        const buttons = li.querySelectorAll(".qty-btn");
        buttons[0].addEventListener("click", () => changeQuantity(item.id, -1));
        buttons[1].addEventListener("click", () => changeQuantity(item.id, 1));

        cartItems.appendChild(li);
    });

    const count = getCartCount();
    cartSummary.textContent = `${count} item${count === 1 ? "" : "s"}`;
    cartCount.textContent = count;
    cartTotal.textContent = `Total: $${getCartTotal().toFixed(2)}`;
}

/* =========================================
    MESSAGES
========================================= */

function displayMessages() {
    const lastPurchased = getLastPurchasedCookie();

    if (lastPurchased.length > 0) {
        welcomeMessage.textContent = `Welcome back! Your last purchase: ${lastPurchased.join(", ")}.`;
    } else {
        welcomeMessage.textContent = "Browse our handmade crafts, made in small batches.";
    }

    sessionMessage.textContent = `Items added this session: ${sessionAdds}`;
}

function updatePage() {
    displayProducts();
    displayCart();
    displayMessages();
}

/* =========================================
    VISUAL FEEDBACK
========================================= */

// Visual indication: when a product is added, the cart badge in the header
// bounces and a green "Added to cart!" notification slides in at the bottom
// of the screen for two seconds.
function showAddedFeedback(id) {
    cartBadge.classList.remove("bounce");
    void cartBadge.offsetWidth; // restart the animation if clicked quickly
    cartBadge.classList.add("bounce");

    notification.textContent = `${getProduct(id).name} added to cart!`;
    notification.classList.add("show");

    clearTimeout(showAddedFeedback.timer);
    showAddedFeedback.timer = setTimeout(() => {
        notification.classList.remove("show");
    }, 2000);
}

/* =========================================
    CHECKOUT
========================================= */

checkoutBtn.addEventListener("click", () => {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const count = getCartCount();
    const total = getCartTotal();

    // Save the purchased product names in a cookie
    const names = cart.map(item => getProduct(item.id).name);
    setLastPurchasedCookie(names);

    alert(`Thank you for your purchase!\n\nItems purchased: ${count}\nTotal cost: $${total.toFixed(2)}`);

    // Purchased items stay sold, so stock is not restored
    cart = [];
    saveCart();
    updatePage();
});

clearBtn.addEventListener("click", clearCart);

/* =========================================
    START
========================================= */

saveCart();
updatePage();