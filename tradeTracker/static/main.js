class struct {
    constructor() {
        this.cardName = null;
        this.cardNum = null;
        this.condition = null;
        this.buyPrice = null;
        this.marketValue = null;
        this.sellPrice = null;
        this.soldDate = null;
    }
}

class queue {
    constructor(size) {
        this.items = [];
        this.size = size;
        this.curr = 0;
        this.next = 1;
        this.prev = size - 1;
    }
    moveNext() {
        this.prev = this.curr;
        this.curr = this.next;
        this.next = (this.next + 1) % this.size;
    }
    movePrev() {
        this.next = this.curr;
        this.curr = this.prev;
        this.prev = (this.prev - 1 + this.size) % this.size;
    }

    enqueue(item) {
        if (this.items.length < this.size) {
            this.items.push(item);
        } else {
            this.items[this.curr] = item;
        }
    }
    getCurrent() {
        return this.items[this.curr];
    }
    getItem() {
        return this.items[this.curr];
    }
    printQueue() {
        console.log(this.items);
    }
}

export function renderField(value, inputType, classList, placeholder, datafield) {
    if (value === null) {
        return `<input type="${inputType}" class="${classList.join(' ')}" placeholder="${placeholder}" data-field="${datafield}" autocomplete="off">`;
    } else {
        return `<p class=" ${classList.join(' ')}" data-field="${datafield}">${value}</p>`;
    }
}

function paymentTypeSelect(className, defaultValue = '') {
    return `
    <select class="${className}">
        <option value=' ' ${defaultValue === '' || defaultValue === ' ' ? 'selected' : ''}>Select payment method</option>
        <option value="Hotovosť" ${defaultValue === 'Hotovosť' ? 'selected' : ''}>Hotovosť</option>
        <option value="Karta" ${defaultValue === 'Karta' ? 'selected' : ''}>Karta</option>
        <option value="Barter" ${defaultValue === 'Barter' ? 'selected' : ''}>Barter</option>
        <option value="Bankový prevod" ${defaultValue === 'Bankový prevod' ? 'selected' : ''}>Bankový prevod</option>
        <option value="Online platba" ${defaultValue === 'Online platba' ? 'selected' : ''}>Online platba</option>
        <option value="Dobierka" ${defaultValue === 'Dobierka' ? 'selected' : ''}>Dobierka</option>
        <option value="Online platobný systém" ${defaultValue === 'Online platobný systém' ? 'selected' : ''}>Online platobný systém</option>
        </select>
    `
}

function paymentTypeRow(type = '', amount = 0, className = 'payment-row') {
    return `
    <div class="${className}">
        <select class="payment-type-select">
            <option value=''>Select payment method</option>
            <option value="Hotovosť" ${type === 'Hotovosť' ? 'selected' : ''}>Hotovosť</option>
            <option value="Karta" ${type === 'Karta' ? 'selected' : ''}>Karta</option>
            <option value="Barter" ${type === 'Barter' ? 'selected' : ''}>Barter</option>
            <option value="Bankový prevod" ${type === 'Bankový prevod' ? 'selected' : ''}>Bankový prevod</option>
            <option value="Online platba" ${type === 'Online platba' ? 'selected' : ''}>Online platba</option>
            <option value="Dobierka" ${type === 'Dobierka' ? 'selected' : ''}>Dobierka</option>
            <option value="Online platobný systém" ${type === 'Online platobný systém' ? 'selected' : ''}>Online platobný systém</option>
        </select>
        <input type="number" class="payment-amount-input" step="0.01" min="0" placeholder="Amount" value="${amount}" autocomplete="off">
        <button class="remove-payment-btn">×</button>
    </div>
    `
}

function parsePaymentMethods(paymentMethodData) {
    if (!paymentMethodData) return [];

    try {
        const parsed = JSON.parse(paymentMethodData);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        // Old format - space separated
        return paymentMethodData.trim().split(' ').map(type => ({ type: type, amount: 0 }));
    }

    return [];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const ALLOWED_PAYMENT_TYPES = new Set([
    'Hotovosť',
    'Karta',
    'Barter',
    'Bankový prevod',
    'Online platba',
    'Dobierka',
    'Online platobný systém'
]);

function validatePayments(payments) {
    if (!Array.isArray(payments) || payments.length === 0) {
        return { valid: false, error: 'At least one payment method required' };
    }

    if (payments.length > 10) {
        return { valid: false, error: 'Too many payment methods (max 10)' };
    }

    for (const payment of payments) {
        if (!payment.type || !ALLOWED_PAYMENT_TYPES.has(payment.type)) {
            return { valid: false, error: 'Invalid payment type selected' };
        }

        const amount = parseFloat(payment.amount);
        if (isNaN(amount) || amount < 0) {
            return { valid: false, error: 'Invalid payment amount' };
        }

        if (amount > 1000000) {
            return { valid: false, error: 'Payment amount too large' };
        }
    }

    return { valid: true };
}

function formatPaymentDisplay(payments) {
    if (!payments || payments.length === 0) return 'No payment method';

    // Escape HTML to prevent XSS, then join with <br>
    return payments.map(p => {
        const type = escapeHtml(p.type || '');
        const amount = parseFloat(p.amount || 0).toFixed(2);
        return `${type}: ${amount}€`;
    }).join('<br>');
}

async function updatePaymentMethod(auctionId, payments) {
    try {
        const response = await fetch(`/updatePaymentMethod/${auctionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ payments: payments })
        })
        const data = await response.json();
        if (data.status === 'success') {
            return true;
        }
    }
    catch (error) {
        console.error('Error updating payment method: ' + error)
        return false;
    }
}

function calculateAuctionBuyPrice(cards) {
    let totalBuyPrice = 0;
    cards.forEach(card => {
        const buyPrice = Number(card.querySelector('.card-price').textContent.replace('€', '').trim());
        totalBuyPrice += buyPrice;
    });
    return totalBuyPrice.toFixed(2);
}

function appendEuroSign(value, dataset) {
    if (dataset === 'card_num' || dataset === 'card_name') {
        return value;
    }
    if (isNaN(value)) {
        return value;
    } else {
        return value + '€';
    }
}

export function replaceWithPElement(dataset, value, element) {
    if (dataset === undefined) {
        return;
    }
    if (value === null) {
        const p = document.createElement('p');
        p.dataset.field = dataset;
        p.classList.add('card-info', dataset.replace('_', '-'));
        element.replaceWith(p);
        return
    }
    const p = document.createElement('p');
    p.dataset.field = dataset;
    p.classList.add('card-info', dataset.replace('_', '-'));
    p.textContent = appendEuroSign(value, dataset);
    element.replaceWith(p);
}

function getInputValueAndPatch(value, element, dataset, cardId) {
    if (!Boolean(value)) {
        return null;
    }
    replaceWithPElement(dataset, value, element);
    patchValue(cardId, value, dataset);
}


async function updateSoldStatus(cardId, isChecked, field) {
    try {
        const response = await fetch(`/update/${cardId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ field: field, value: isChecked })
        });
        const data = await response.json();
        if (!(data.status === 'success')) {
            console.error('Error updating sold status:', data);
            return;
        } else {
            return
        }
    } catch (e) {
        console.error('Error updating sold status:', e);
        return;
    }
}

//These two are the same

async function patchValue(id, value, dataset) {
    if (value === " ") {
        value = null;
    }
    if (!value === null || !value === undefined) {
        value = String(value);
        value = value.replace('€', '');

    }
    try {
        const response = await fetch(`/update/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ field: dataset, value: value })
        });
        const data = await response.json();
        if (!(data.status === 'success')) {
            console.error('failed to update:', dataset)
            return;
        } else {
            return
        }
    } catch (e) {
        console.error('Error updating value:', e);
    }
}

function deleteAuction(id, div) {
    fetch(`/deleteAuction/${id}`, {
        method: 'DELETE',
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                div.remove();
            } else {
                console.error('Error deleting auction:', data);
            }
        })
        .catch(error => {
            console.error('Error deleting auction:', error);
        });
}



async function setAuctionBuyPrice(cards, auctionTab) {
    const auctionBuyPriceElement = auctionTab.querySelector('.auction-price');
    const newAuctionBuyPrice = calculateAuctionBuyPrice(cards);
    auctionBuyPriceElement.textContent = appendEuroSign(newAuctionBuyPrice, 'auction-price');
    const auctionId = auctionTab.getAttribute('data-id');
    await updateAuction(auctionId, newAuctionBuyPrice, 'auction_price');
}




async function removeCard(id, div) {
    try {
        const response = await fetch(`/deleteCard/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();

        if (data.status === 'success') {
            div.remove();
            return true;
        } else {
            console.error('Error deleting card:', data);
            return false;
        }
    } catch (error) {
        console.error('Error deleting card:', error);
        return false;
    }
}

async function removeBulkItem(bulkId, bulkDiv) {
    try {
        const response = await fetch(`/deleteBulkItem/${bulkId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (data.status === 'success') {
            bulkDiv.remove();
            return true;
        } else {
            console.error('Error deleting bulk item:', data);
            return false;
        }
    } catch (error) {
        console.error('Error deleting bulk item:', error);
        return false;
    }
}

async function updateAuction(auctionId, value, field) {
    try {
        const response = await fetch(`/updateAuction/${auctionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ field: field, value: value })
        });
        const data = await response.json();
        if (!(data.status === 'success')) {
            console.error('Error updating auction:', data);
            return;
        } else {
            return
        }
    } catch (error) {
        console.error('Error updating auction:', error);
        return
    }
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function soldReportBtn() {
    const salesBtn = document.querySelector('.sales-btn');
    salesBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.classList.add('sold-report-container');
        div.innerHTML = `
            <div class="sold-report-content">
                <form class="sold-report-form" method="get">
                <div>
                    <label for="sold-month">Month:</label>
                    <input type="number" id="sold-month" name="sold-month" min="1" max="12" required value=${new Date().getMonth()}>
                </div>
                <div>
                    <label for="sold-year">Year:</label>
                    <input type="number" id="sold-year" name="sold-year" min="2000" max="2100" required value=${new Date().getFullYear()}>
                </div>
                <div class="generate-report-button">
                    <button type="submit">Generate Report</button>
                </div>
                </form>
            </div>
    `;
        document.body.appendChild(div);
        const form = div.querySelector('.sold-report-form');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const month = form.querySelector('#sold-month').value;
            const year = form.querySelector('#sold-year').value;
            generateSoldReport(month, year, div);
        });
        div.addEventListener('click', (event) => {
            if (event.target === div) {
                div.remove();
            }
        });
    });
}

async function generateSoldReport(month, year, div) {
    const response = await fetch(`/generateSoldReport?month=${month}&year=${year}`);
    const data = await response.json();
    if (data.status === 'success') {
        console.log('Sold report generated successfully');
        div.remove();
        alert(data.pdf_path);
        // Handle successful report generation (e.g., display a success message)
    } else {
        // Handle errors (e.g., display an error message)
        console.error('Error generating sold report:', data.message);
    }
}

function importCSV() {
    const input = document.querySelector('.import-sold-csv');
    input.style.opacity = 0;
    input.addEventListener('change', async (event) => {
        const file = event.target.files;
        if (file && file.length === 1) {
            const formData = new FormData();
            formData.append("csv-upload", file[0]);
            const response = await fetch('/importSoldCSV', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            switch (data.status) {
                case "success":
                    window.location.reload()
                    break;
                case "missing":
                    alert('No file uploaded')
                    break;
                case "file":
                    alert('No file selected')
                    break;
                case "extension":
                    alert('Please upload valid CSV file')
                    break;
                case "duplicate":
                    alert('File already uploaded')
                    break;
            }
        }
    })
}

async function getInventoryValue() {
    try {
        const response = await fetch('/inventoryValue');
        const data = await response.json();
        return data.value;
    } catch (e) {
        console.error(e);
    }
}



export async function updateInventoryValueAndTotalProfit() {
    const value = await getInventoryValue();
    const inventoryValueElement = document.querySelector('.inventory-value-value');
    if (value != null) {
        inventoryValueElement.textContent = appendEuroSign(value.toFixed(2));
    } else {
        inventoryValueElement.textContent = '0.00 €';
    }
}

function cartValue(cartContent) {
    let sum = 0.0;
    cartContent.cards.forEach(card => {
        if (card.marketValue) {
            sum += Number(card.marketValue);
        }
    });

    if (cartContent.sealed) {
        cartContent.sealed.forEach(item => {
            sum += Number(item.marketValue.replace("€", ""));
        })
    };


    if (cartContent.bulkItem) {
        sum += Number(sum) + Number(cartContent.bulkItem.sell_price);
    }

    if (cartContent.holoItem) {
        sum += Number(cartContent.holoItem.sell_price);
    }
    return sum.toFixed(2);
}

const existingIDs = new Set();

function saveCartContentToSession() {
    const cardsEl = document.querySelector('.cart-content').children;
    const sealedEl = document.querySelector('.sealed-content').children;
    const bulkEl = document.querySelector('.bulk-cart-content');
    const holoEl = document.querySelector('.holo-cart-content');

    let cardsData = [];
    if (cardsEl.length > 0) {
        for (const item of cardsEl) {
            if (item.tagName === 'P') return;
            const card = new struct();
            const data = item.querySelectorAll('p');
            card.cardName = data[0].textContent;
            card.cardNum = data[1].textContent;
            card.condition = data[2].textContent;
            card.marketValue = data[3].textContent;
            cardsData.push(card);
        }
    }

    let sealedData = [];
    if (sealedEl.length > 0) {
        for (const item of sealedEl) {
            const sealed = {
                name: item.querySelector('.sealed-name').textContent,
                price: item.querySelector('.sealed-price').textContent
            }
            sealedData.push(sealed);
        }
    }
    let bulkData = {}
    if (bulkEl.children.length > 0) {
        bulkData = {
            type: 'bulk',
            quantity: bulkEl.querySelector('.bulk-quantity').textContent.replace('q: ', ''),
            price: bulkEl.querySelector('.bulk-sell-price').value || ''
        }
    }

    let holoData = {}
    if (holoEl.children.length > 0) {
        holoData = {
            type: 'holo',
            quantity: holoEl.querySelector('.holo-quantity').textContent.replace('q: ', ''),
            price: holoEl.querySelector('.holo-sell-price').value || ''
        }
    }
    let setIds = []

    existingIDs.forEach((id) => {
        setIds.push(id);
    });
    const cartData = {
        cards: cardsData,
        sealed: sealedData,
        bulk: bulkData,
        holo: holoData,
        existingIDs: setIds
    };

    sessionStorage.setItem('cartData', JSON.stringify(cartData));
}

function loadCartContentFromSession() {
    const savedData = sessionStorage.getItem('cartData');
    if (!savedData) return;

    try {
        const cartData = JSON.parse(savedData);

        // Restore existingIDs Set
        if (cartData.existingIDs) {
            existingIDs.clear();
            cartData.existingIDs.forEach(id => existingIDs.add(id));
        }
        console.log(existingIDs);

        // Restore cards
        if (cartData.cards && cartData.cards.length > 0) {
            const contentDiv = document.querySelector('.cart-content');
            contentDiv.innerHTML = '';
            
            cartData.cards.forEach((card,index) => {
                const cardDiv = document.createElement('div');
                cardDiv.setAttribute('cardid', cartData.existingIDs[index])
                cardDiv.innerHTML = `
                    <p>${card.cardName}</p>
                    <p>${card.cardNum}</p>
                    <p>${card.condition}</p>
                    <p class='market-value-invoice'>${card.marketValue}</p>
                    <button class='remove-from-cart'>Remove</button>
                `;
                contentDiv.appendChild(cardDiv);

                // Add event listeners for market value editing
                const marketValueInCart = cardDiv.querySelector('.market-value-invoice');
                marketValueInCart.addEventListener('dblclick', () => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = card.marketValue.replace('€', '');
                    marketValueInCart.replaceWith(input);
                    input.focus();
                    input.addEventListener('blur', () => {
                        let newValue = input.value.replace(',', '.');
                        if (isNaN(newValue)) {
                            newValue = card.marketValue;
                        }
                        const p = document.createElement('p');
                        p.classList.add('market-value-invoice');
                        p.textContent = newValue + '€';
                        input.replaceWith(p);
                        card.marketValue = newValue;
                        saveCartContentToSession();
                    });
                    input.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            input.blur();
                        }
                    });
                });

                // Add remove button listener
                const removeBtn = cardDiv.querySelector('.remove-from-cart');
                removeBtn.addEventListener('click', () => {
                    const cardId = cardDiv.getAttribute('cardid');
                    console.log(cardId);
                    if (cardId) {
                        existingIDs.delete(cardId);
                    }
                    console.log(existingIDs);
                    cardDiv.remove();
                    
                    if (contentDiv.childElementCount === 0) {
                        contentDiv.innerHTML = '<p>Your cart is empty</p>';
                    }
                    saveCartContentToSession();
                });
            });
        }

        // Restore sealed items
        if (cartData.sealed && cartData.sealed.length > 0) {
            const sealedContent = document.querySelector('.sealed-content');
            
            cartData.sealed.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('sealed-item-cart');
                itemDiv.innerHTML = `
                    <p class='sealed-name'>${item.name}</p>
                    <p class='sealed-price'>${item.price}</p>
                    <button class='remove-from-cart'>Remove</button>
                `;

                const removeFromCart = itemDiv.querySelector('.remove-from-cart');
                removeFromCart.addEventListener('click', () => {
                    const sid = itemDiv.getAttribute('sid');
                    if (sid) {
                        existingIDs.delete(sid);
                    }
                    itemDiv.remove();
                    saveCartContentToSession();
                });

                sealedContent.appendChild(itemDiv);
            });
        }

        // Restore bulk items
        if (cartData.bulk && !isEmpty(cartData.bulk)) {
            const bulkCartDiv = document.querySelector('.bulk-cart-content');
            const div = document.createElement('div');
            div.classList.add('bulk-cart-item-bulk');
            div.innerHTML = `
                <p>Bulk</p>
                <p class='bulk-quantity'>q: ${cartData.bulk.quantity}</p>
                <input type='text' class='bulk-sell-price' style='width:70px' value='${cartData.bulk.price}'>
                <button class='remove-from-cart'>Remove</button>
            `;
            bulkCartDiv.appendChild(div);

            const sellPriceInput = div.querySelector('.bulk-sell-price');
            sellPriceInput.addEventListener('blur', saveCartContentToSession);

            const removeButton = div.querySelector('.remove-from-cart');
            removeButton.addEventListener('click', () => {
                bulkCartDiv.innerHTML = '';
                saveCartContentToSession();
            });
        }

        // Restore holo items
        if (cartData.holo && !isEmpty(cartData.holo)) {
            const holoCartDiv = document.querySelector('.holo-cart-content');
            const div = document.createElement('div');
            div.classList.add('holo-cart-item-holo');
            div.innerHTML = `
                <p>Holo</p>
                <p class='holo-quantity'>q: ${cartData.holo.quantity}</p>
                <input type='text' class='holo-sell-price' style='width:70px' value='${cartData.holo.price}'>
                <button class='remove-from-cart'>Remove</button>
            `;
            holoCartDiv.appendChild(div);

            const sellPriceInput = div.querySelector('.holo-sell-price');
            sellPriceInput.addEventListener('blur', saveCartContentToSession);

            const removeButton = div.querySelector('.remove-from-cart');
            removeButton.addEventListener('click', () => {
                holoCartDiv.innerHTML = '';
                saveCartContentToSession();
            });
        }

    } catch (e) {
        console.error('Error loading cart data from sessionStorage:', e);
    }
}

function removeCartContentFromSession() {
    sessionStorage.removeItem('cartData');
}

// SessionStorage helper functions for modal persistence
function saveModalDataToSession() {
    const modalData = {
        clientName: document.querySelector('.client-name')?.value || '',
        clientAddress: document.querySelector('.client-address')?.value || '',
        clientCity: document.querySelector('.client-city')?.value || '',
        clientCountry: document.querySelector('.client-country')?.value || '',
        paybackDate: document.querySelector('.date-input')?.value || '',
        price: document.querySelector('.price-input')?.value || '',
        shippingWay: document.querySelector('.shipping-way')?.value || '',
        shippingPrice: document.querySelector('.shipping-price')?.value || '',
        paymentMethods: []
    };

    // Collect all payment methods
    const paymentDivs = document.querySelectorAll('.payment-div');
    paymentDivs.forEach(div => {
        const paymentType = div.querySelector('.payment-type')?.value || '';
        const amount = div.querySelector('.amount, .amunt')?.value || '';
        modalData.paymentMethods.push({ type: paymentType, amount: amount });
    });

    sessionStorage.setItem('invoiceModalData', JSON.stringify(modalData));
}

function loadModalDataFromSession(recieverDiv) {
    const savedData = sessionStorage.getItem('invoiceModalData');
    if (!savedData) return;

    try {
        const modalData = JSON.parse(savedData);

        // Restore simple fields
        const clientName = recieverDiv.querySelector('.client-name');
        const clientAddress = recieverDiv.querySelector('.client-address');
        const clientCity = recieverDiv.querySelector('.client-city');
        const clientCountry = recieverDiv.querySelector('.client-country');
        const paybackDate = recieverDiv.querySelector('.date-input');
        const priceInput = recieverDiv.querySelector('.price-input');
        const shippingWay = recieverDiv.querySelector('.shipping-way');
        const shippingPrice = recieverDiv.querySelector('.shipping-price');

        if (clientName) clientName.value = modalData.clientName;
        if (clientAddress) clientAddress.value = modalData.clientAddress;
        if (clientCity) clientCity.value = modalData.clientCity;
        if (clientCountry) clientCountry.value = modalData.clientCountry;
        if (paybackDate && modalData.paybackDate) paybackDate.value = modalData.paybackDate;
        if (priceInput) priceInput.value = modalData.price;
        if (shippingWay) shippingWay.value = modalData.shippingWay;
        if (shippingPrice) shippingPrice.value = modalData.shippingPrice;

        // Restore payment methods
        if (modalData.paymentMethods && modalData.paymentMethods.length > 0) {
            const paymentContainer = recieverDiv.querySelector('.payment-container');
            const firstPaymentDiv = paymentContainer.querySelector('.payment-div');

            // Set first payment method (already exists in HTML)
            if (firstPaymentDiv && modalData.paymentMethods[0]) {
                const firstSelect = firstPaymentDiv.querySelector('.payment-type');
                const firstAmount = firstPaymentDiv.querySelector('.amount');
                if (firstSelect) firstSelect.value = modalData.paymentMethods[0].type;
                if (firstAmount) firstAmount.value = modalData.paymentMethods[0].amount;
            }

            // Add additional payment methods (if any)
            for (let i = 1; i < modalData.paymentMethods.length; i++) {
                const newSelectDiv = document.createElement('div');
                newSelectDiv.classList.add('payment-div');
                newSelectDiv.innerHTML = `
                    ${paymentTypeSelect('payment-type')}
                    <input type='number' class='amount' value='${modalData.paymentMethods[i].amount}'></input>
                `;

                // Set the payment type after adding to DOM
                paymentContainer.append(newSelectDiv);
                const select = newSelectDiv.querySelector('.payment-type');
                if (select) select.value = modalData.paymentMethods[i].type;

                // Add event listeners to restored inputs
                const newInputs = newSelectDiv.querySelectorAll('input, select');
                newInputs.forEach(input => {
                    input.addEventListener('input', saveModalDataToSession);
                    input.addEventListener('change', saveModalDataToSession);
                });
            }
        }
    } catch (e) {
        console.error('Error loading modal data from sessionStorage:', e);
    }
}

function clearModalDataFromSession() {
    sessionStorage.removeItem('invoiceModalData');
}

function initializeCart() {
    shoppingCart();
    addBulkToCart();
    addHoloToCart();
}

function shoppingCart() {
    const contentDiv = document.querySelector(".cart-content");
    const bulkCartDiv = document.querySelector(".bulk-cart-content");
    const holoCartDiv = document.querySelector(".holo-cart-content");
    const sealedContent = document.querySelector('.sealed-content');

    if (contentDiv.childElementCount === 0) {
        contentDiv.innerHTML = '<p>Your cart is empty</p>';
    }
    const cartDiv = document.querySelector(".shopping-cart");
    if (cartDiv) {
        cartDiv.addEventListener('click', (e) => {
            if (e.target === cartDiv) {
                cartDiv.classList.toggle('expanded');
            }
        });
    }


    const confirmButton = document.querySelector(".confirm-btn");
    confirmButton.addEventListener('click', async () => {
        const cartContent = {};
        if (contentDiv.childElementCount === 1 && contentDiv.children[0].tagName === 'P' && bulkCartDiv.childElementCount === 0 && holoCartDiv.childElementCount === 0 && sealedContent.childElementCount === 0) {
            console.log("cart empty");
            return;
        }
        let recieverDiv = document.querySelector('.reciever-div');
        if (recieverDiv) {
            return
        }
        const children = contentDiv.children;
        let cards = []

        Array.from(children).forEach(cardDiv => {
            // Get the card attributes
            const cardId = cardDiv.getAttribute("cardId");
            const auctionId = cardDiv.getAttribute("auctionId");

            // Get all paragraph elements
            const paragraphs = cardDiv.querySelectorAll('p');

            // Create card object with the data
            const cardData = {
                cardId: cardId,
                auctionId: auctionId,
                cardName: paragraphs[0]?.textContent || '',
                cardNum: paragraphs[1]?.textContent || '',
                condition: paragraphs[2]?.textContent || '',
                marketValue: paragraphs[3]?.textContent.replace('€', '') || ''
            };

            cards.push(cardData);
        });
        cartContent.cards = cards;

        const sealedItem = sealedContent.querySelectorAll(".sealed-item-cart");
        if (sealedItem) {
            let sealed = [];
            sealedItem.forEach(item => {
                const sid = item.getAttribute('sid');
                const auctionId = item.getAttribute('auction_id') || null;

                const paragraphs = item.querySelectorAll('p');

                const sealedData = {
                    sid: sid,
                    auctionId: auctionId,
                    sealedName: paragraphs[0]?.textContent || '',
                    marketValue: paragraphs[1]?.textContent || ''
                };
                sealed.push(sealedData);
            });
            cartContent.sealed = sealed;
        }

        const bulkCartContent = document.querySelector(".bulk-cart-content");
        const bulkItems = bulkCartContent.querySelector('.bulk-cart-item-bulk');
        const holoCartContent = document.querySelector(".holo-cart-content");
        const holoItems = holoCartContent.querySelector('.holo-cart-item-holo');
        if (bulkItems) {
            const bulkQuantity = Number(bulkItems.querySelectorAll('p')[1].textContent.replace('q: ', ''));

            //this is bad I need to think about this shit cause no way this is correct

            const sellPriceInput = bulkItems.querySelector('.bulk-sell-price').value.replace(',', '.');
            const bulk = {
                counter_name: 'bulk',
                quantity: bulkQuantity,
                unit_price: sellPriceInput / bulkQuantity ? (Number(sellPriceInput) / bulkQuantity).toFixed(2) : 0.01,
                sell_price: sellPriceInput ? Number(sellPriceInput) : 0.01,
                buy_price: 0.01
            };
            cartContent.bulkItem = bulk;
        }

        if (holoItems) {
            const holoQuantity = Number(holoItems.querySelectorAll('p')[1].textContent.replace('q: ', ''));
            const sellPriceInput = holoItems.querySelector('.holo-sell-price').value.replace(',', '.');
            const holo = {
                counter_name: 'holo',
                quantity: holoQuantity,
                unit_price: sellPriceInput / holoQuantity ? (Number(sellPriceInput) / holoQuantity).toFixed(2) : 0.03,
                sell_price: sellPriceInput ? Number(sellPriceInput) : 0.03,
                buy_price: 0.03
            };
            cartContent.holoItem = holo;
        }


        const cartVal = Number(cartValue(cartContent));

        if (!recieverDiv && Object.keys(cartContent).length != 0) {
            const body = document.querySelector('body');
            recieverDiv = document.createElement('div');
            recieverDiv.classList.add('reciever-div');
            recieverDiv.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <div class='complete-invoice-info'>
                        <p>Forma uhrady</p>
                        <div class='payment-container'>
                            <div class='payment-div'>
                                ${paymentTypeSelect('payment-type', 'Bankový prevod')}
                                <input type='number' class='amount'></input>
                            </div>
                        </div>
                        <button class='add-another-payment-method'>Add another payment method</button>
                    </div>
                    <div>
                        <p>Client name and surname</p>
                        <input type='text' class='client-name'>
                    </div>
                    <div>
                        <p>Address</p>
                        <input type='text' class='client-address'>
                    </div>
                    <div>
                        <p>City</p>
                        <input type='text' class='client-city'>
                    <div>
                    <div>
                        <p>Country</p>
                        <input type='text' class='client-country'>
                    </div>
                    <div>
                        <p>Payback date</p>
                        <input type='date' class='date-input'>
                    </div>
                    <div>
                        <p>Price</p>
                        <input type=text placeholder="${cartVal}" class="price-input">
                    </div>
                    <div>
                    <p>Shipping</p>
                    <p class='shipping-way'>Doprava / Poštovné – samostatná služba</p>
                    <input type=text placeholder="Price of shipping" class="shipping-price">
                    </div>
                    <button class="generate-invoice">Confirm</button>
                </div>
                `;
            body.append(recieverDiv);

            // Load saved data from sessionStorage if exists
            loadModalDataFromSession(recieverDiv);

            // Add event listeners to save data on input
            const modalInputs = recieverDiv.querySelectorAll('input, select');
            modalInputs.forEach(input => {
                input.addEventListener('input', saveModalDataToSession);
                input.addEventListener('change', saveModalDataToSession);
            });

            const closeModal = recieverDiv.querySelector('.close-modal');
            closeModal.addEventListener('click', () => {
                recieverDiv.remove();
                recieverDiv = null;
            });

            const button = document.querySelector('.add-another-payment-method');
            button.addEventListener('click', () => {
                const paymentContainer = document.querySelector('.payment-container');
                const newSelectDiv = document.createElement('div');
                newSelectDiv.classList.add('payment-div');
                newSelectDiv.innerHTML = `
                ${paymentTypeSelect('payment-type')}
                <input type='number' class='amount'></input>                            
                `;
                paymentContainer.append(newSelectDiv);

                // Add event listeners to new inputs for sessionStorage
                const newInputs = newSelectDiv.querySelectorAll('input, select');
                newInputs.forEach(input => {
                    input.addEventListener('input', saveModalDataToSession);
                    input.addEventListener('change', saveModalDataToSession);
                });
            });

            const dateInput = document.querySelector('.date-input');
            dateInput.value = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        const generateInvoiceBtn = document.querySelector('.generate-invoice');
        {
            generateInvoiceBtn.addEventListener('click', async () => {

                // Collect all payment methods (every time Confirm is clicked)
                const paymentDivs = recieverDiv.querySelectorAll('.payment-div');
                const paymentMethods = [];
                paymentDivs.forEach(div => {
                    const paymentType = div.querySelector('.payment-type')?.value;
                    if (!paymentType || paymentType === '' || paymentType === ' ') {
                        return;
                    }
                    const payment = {
                        type: paymentType,
                        amount: parseFloat(div.querySelector('.amount')?.value.replace(',', '.')) || 0
                    };
                    paymentMethods.push(payment);
                })

                // Get values by specific class names (every time)
                const clientName = recieverDiv.querySelector('.client-name')?.value || '';
                const clientAddress = recieverDiv.querySelector('.client-address')?.value || '';
                const clientCity = recieverDiv.querySelector('.client-city')?.value || '';
                const clientCountry = recieverDiv.querySelector('.client-country')?.value || '';
                const paybackDate = recieverDiv.querySelector('.date-input')?.value || '';
                const shippingWay = recieverDiv.querySelector('.shipping-way')?.textContent || '';
                const shippingPrice = recieverDiv.querySelector('.shipping-price')?.value.replace(',', '.') || '';

                // Calculate total payment amount from payment methods
                const paymentTotal = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
                const cartValueInput = document.querySelector('.price-input').value.replace(',', '.') || cartVal;
                const expectedTotal = parseFloat(cartValueInput) + Number(shippingPrice);

                // Validate payment amounts match cart total
                if (paymentMethods.length > 1) {
                    // If multiple payment methods, check that sum matches total
                    if (Math.abs(paymentTotal - expectedTotal) > 0.01) { // Allow 1 cent tolerance for rounding
                        alert(`Payment amount (${paymentTotal.toFixed(2)}€) is not equal to total cart value (${expectedTotal.toFixed(2)}€)`);
                        return;
                    }
                } else if (paymentMethods.length === 1) {
                    // If single payment method, auto-set amount to cart total
                    paymentMethods[0].amount = expectedTotal;
                } else {
                    alert('Please select at least one payment method');
                    return;
                }

                // Update or create recieverInfo (always update payment methods)
                const recieverInfo = {
                    paymentMethods: paymentMethods,
                    nameAndSurname: clientName,
                    address: clientAddress,
                    city: clientCity,
                    state: clientCountry,
                    paybackDate: paybackDate,
                    total: null,
                };
                cartContent.recieverInfo = recieverInfo;

                if (shippingPrice !== "") {
                    const shipping = {
                        shippingWay: shippingWay,
                        shippingPrice: shippingPrice.replace(',', '.'),
                    };
                    cartContent.shipping = shipping;
                }

                // Apply price adjustment if cart value was manually changed
                if (cartValueInput != cartVal) {
                    const priceDiff = cartVal - cartValueInput;
                    for (let i = 0; i < cartContent.cards.length; i++) {
                        const discount = ((cartContent.cards[i].marketValue / cartVal) * priceDiff);
                        cartContent.cards[i].marketValue = (cartContent.cards[i].marketValue - discount).toFixed(2)
                    }
                }

                let vendorCheckBox = document.querySelector('.vendor-type').checked;
                cartContent.recieverInfo.total = Number(cartValue(cartContent));
                if (Object.keys(cartContent).length !== 0) {
                    const response = await fetch(`/invoice/${Number(vendorCheckBox)}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(cartContent),
                        });
                    const data = await response.json();
                    if (data.status === 'success') {
                        console.log("success")
                        cards = [];
                        for (const key in cartContent) {
                            delete cartContent[key];
                        }
                        contentDiv.innerHTML = 'Your cart is empty';
                        bulkCartContent.innerHTML = '';
                        holoCartContent.innerHTML = '';
                        loadBulkHoloValues();
                        existingIDs.clear();
                        vendorCheckBox = false;
                        recieverDiv.remove();
                        recieverDiv = null;

                        // Clear sessionStorage on successful invoice generation
                        clearModalDataFromSession();
                        removeCartContentFromSession();

                        alert(data.pdf_path)
                        //recalculate auction price and profit
                    } else if (data.status === 'error') {
                        // Display error message for insufficient inventory
                        alert('Error: ' + data.message);
                        console.error('Invoice generation failed:', data.message);
                    } else {
                        console.error("something went wrong")
                    }
                }
            });
        }
    });
}

function addToShoppingCart(card, cardId, auctionId) {
    if (!existingIDs.has(cardId)) {
        existingIDs.add(cardId);
        const contentDiv = document.querySelector(".cart-content");
        if (contentDiv.childElementCount === 1 && contentDiv.children[0].tagName === 'P') {
            contentDiv.innerHTML = '';
        }
        const cardDiv = document.createElement('div');
        cardDiv.setAttribute("cardId", `${cardId}`)
        cardDiv.setAttribute("auctionId", `${auctionId}`)
        cardDiv.innerHTML = `
            <p>${card.cardName}</p>
            <p>${card.cardNum}</p>
            <p>${card.condition}</p>
            <p class='market-value-invoice'>${card.marketValue}€</p>
            <button class='remove-from-cart'>Remove</button>
            `
        contentDiv.append(cardDiv);
        saveCartContentToSession();
        const marketValueInCart = cardDiv.querySelector('.market-value-invoice');
        marketValueInCart.addEventListener('dblclick', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = card.marketValue.replace('€', '');
            marketValueInCart.replaceWith(input);
            input.focus();
            input.addEventListener('blur', () => {
                let newValue = input.value.replace(',', '.');
                if (isNaN(newValue)) {
                    newValue = card.marketValue;
                }
                const p = document.createElement('p');
                p.classList.add('market-value-invoice');
                p.textContent = newValue + '€';
                input.replaceWith(p);
                card.marketValue = newValue;
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    input.blur();
                }
            });
        });

        const removeBtn = cardDiv.querySelector('.remove-from-cart');
        removeBtn.addEventListener('click', () => {
            existingIDs.delete(cardId);
            cardDiv.remove();
            if (contentDiv.childElementCount === 0) {
                contentDiv.innerHTML = '<p>Your cart is empty</p>';
            }
            saveCartContentToSession();
        });
    }
}

function currentCartValue(type) {
    const contentDiv = document.querySelector(`.${type}-cart-content`);
    const cartQuantity = contentDiv.querySelector(`.${type}-quantity`);
    if (cartQuantity) {
        return Number(cartQuantity.textContent.replace('q: ', ''));
    } else {
        return 0;
    }
}

function addSealedToCart(sealed, sid, auctionId = null) {
    if (!existingIDs.has(sid)) {
        existingIDs.add(sid);
        const sealedDiv = document.querySelector('.sealed-content');
        const itemDiv = document.createElement('div');
        itemDiv.setAttribute('sid', sid);
        itemDiv.classList.add('sealed-item-cart');
        if (auctionId != null) {
            itemDiv.setAttribute('auction_id', auctionId)
        }
        itemDiv.innerHTML = `
        <p class='sealed-name'>${sealed.name}</p>
        <p class='sealed-price'>${sealed.market_value}€</p>
        <button class='remove-from-cart'>Remove</p>
        `

        const removeFromCart = itemDiv.querySelector('.remove-from-cart');
        removeFromCart.addEventListener('click', () => {
            existingIDs.delete(sid);
            itemDiv.remove();
            saveCartContentToSession();
        });

        sealedDiv.appendChild(itemDiv);
        saveCartContentToSession();
    }
    return;
}


function addBulkToCart() {
    const button = document.querySelector('.card-add-bulk');
    const input = document.querySelector('.cart-bulk-input');
    const contentDiv = document.querySelector(".bulk-cart-content");
    button.addEventListener('click', () => {
        const value = input.value;
        const bulkItems = contentDiv.querySelector('.bulk-cart-item-bulk');
        const inventorySize = document.querySelector('.bulk-value').textContent;
        const maxBulk = Number(inventorySize);
        if (Number(value) + currentCartValue('bulk') > maxBulk) {
            alert(`You can not add more than ${maxBulk} bulk items to the cart`);
            return;
        }

        if (!bulkItems) {
            if (value && !isNaN(value)) {
                const div = document.createElement('div');
                div.classList.add('bulk-cart-item-bulk');
                div.innerHTML = `
                    <p>Bulk</p>
                    <p class='bulk-quantity'>q: ${value}</p>
                    <input type='text' class='bulk-sell-price' style='width:70px'>
                    <button class='remove-from-cart'>Remove</button>`

                contentDiv.appendChild(div);
                const sellPriceInput = contentDiv.querySelector('.bulk-sell-price')
                sellPriceInput.addEventListener("blur", saveCartContentToSession)
                saveCartContentToSession();
            }
        } else {
            const quantityP = bulkItems.querySelectorAll('p')[1];
            let currentQuantity = Number(quantityP.textContent.replace('q: ', ''));
            if (value && !isNaN(value)) {
                currentQuantity += Number(value);
                quantityP.textContent = `q: ${currentQuantity}`;
                saveCartContentToSession();
            }
        }
        const removeButton = contentDiv.querySelector('.remove-from-cart');
        removeButton.addEventListener('click', () => {
            contentDiv.innerHTML = '';
            saveCartContentToSession();
        });
    });
    input.addEventListener('keydown', (event) => {
        if (event.key == 'Enter') {
            button.click();
        }
    });
}

function addHoloToCart() {
    const button = document.querySelector('.card-add-holo');
    const input = document.querySelector('.cart-holo-input');
    const contentDiv = document.querySelector(".holo-cart-content");

    button.addEventListener('click', () => {
        const value = input.value;
        const holoItems = contentDiv.querySelector('.holo-cart-item-holo');
        const inventorySize = document.querySelector('.holo-value').textContent;
        const maxHolo = Number(inventorySize);
        if (Number(value) + currentCartValue('holo') > maxHolo) {
            alert(`You can not add more than ${maxHolo} holo items to the cart`);
            return;
        }

        if (!holoItems) {
            if (value && !isNaN(value)) {
                const div = document.createElement('div');
                div.classList.add('holo-cart-item-holo');
                div.innerHTML = `
                    <p>Holo</p>
                    <p class='holo-quantity'>q: ${value}</p>
                    <input type='text' class='holo-sell-price' style='width:70px'>
                    <button class='remove-from-cart'>Remove</button>`
                contentDiv.appendChild(div);
                const sellPriceInput = contentDiv.querySelector('.holo-sell-price')
                sellPriceInput.addEventListener("blur", saveCartContentToSession)

                saveCartContentToSession();
            }
        } else {
            const quantityP = holoItems.querySelectorAll('p')[1];
            let currentQuantity = Number(quantityP.textContent.replace('q: ', ''));
            if (value && !isNaN(value)) {
                currentQuantity += Number(value);
                quantityP.textContent = `q: ${currentQuantity}`;
                saveCartContentToSession();
            }
        }
        const removeButton = contentDiv.querySelector('.remove-from-cart');
        removeButton.addEventListener('click', () => {
            contentDiv.innerHTML = '';
            saveCartContentToSession();
        });
    });
    input.addEventListener('keydown', (event) => {
        if (event.key == 'Enter') {
            button.click();
        }
    });
}

function addResultScrollingWithArrows(searchInput, resultsQueue) {
    searchInput.addEventListener('keydown', (event) => {
        if (event.key == 'ArrowDown') {
            event.preventDefault();
            resultsQueue.moveNext();
            resultsQueue.getCurrent().focus();
        }
        if (event.key == 'ArrowUp') {
            event.preventDefault();
            resultsQueue.movePrev();
            resultsQueue.getCurrent().focus();
        }
    });
}


function searchBar() {
    const searchInput = document.querySelector('.search-field');

    const searchBtn = document.querySelector('.search-btn');
    let results = null;
    searchInput.addEventListener('keydown', async (event) => {
        if (event.key == 'Enter') {
            if (searchInput.value == "") {

                const searchContainer = document.querySelector('.search-results');
                searchContainer.innerHTML = ''; // Clear previous results
                return;
            }
            results = await search(searchInput.value.toUpperCase());
            const resultsQueue = new queue(results.length + 1) //if no results it thows error;
            resultsQueue.enqueue(searchInput)
            displaySearchResults(results, resultsQueue, searchInput);
            addResultScrollingWithArrows(searchInput, resultsQueue, searchInput);

        }
    })
    searchBtn.addEventListener('click', async () => {
        if (searchInput.value == "") {
            const searchContainer = document.querySelector('.search-results');
            searchContainer.innerHTML = ''; // Clear previous results
        }
        results = await search(searchInput.value.toUpperCase().trim());
        const resultsQueue = new queue(results.length + 1);
        resultsQueue.enqueue(searchInput)
        displaySearchResults(results, resultsQueue);
        searchInput.focus();
        addResultScrollingWithArrows(searchInput, resultsQueue);
    });
}

async function search(searchPrompt) {

    const jsonbody = JSON.stringify({ query: searchPrompt, cartIds: [...existingIDs] });
    const response = await fetch('/searchCard',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: jsonbody,
        }
    )
    const data = await response.json();
    if (data.status == "success") {
        return data.value;
    } else {
        console.error('Search failed');
    }
}

function displaySearchResults(results, resultsQueue, searchInput) {

    const searchContainer = document.querySelector('.search-results');
    searchContainer.innerHTML = ''; // Clear previous results

    if (!results || results.length === 0) {
        const div = document.createElement('div');
        div.classList.add('search-result-item');
        div.innerHTML = '<p>No results found</p>';
        searchContainer.appendChild(div);
        return;
    }

    results.forEach(result => {
        const div = document.createElement('div');
        div.classList.add('search-result-item');
        div.tabIndex = 0;

        // Check if this is a sealed item (has 'sid' field) or a card
        const isSealed = result.hasOwnProperty('sid');

        if (isSealed) {
            // Handle sealed item display
            const sealed = {
                name: result.name,
                market_value: result.market_value
            };

            div.innerHTML = `
                <p class="result result-sealed-name">${result.name || 'N/A'}</p>
                <p class="result result-market-value">${result.market_value ? result.market_value + '€' : 'N/A'}</p>
                <p class="result result-auction-name">${result.auction_name || (result.auction_id ? result.auction_id - 1 : 'Unassigned')}</p>
                <span class="result-type-badge sealed-badge">Sealed</span>
                ${result.auction_id || result.auction_name ? `<p class="result result-auction-name">${result.auction_name || result.auction_id - 1}</p>` : `<p></p>`}
                <button class="add-to-cart-btn">Add to cart</button>
                ${result.auction_id ? `<button class="view-auction" data-id="${result.auction_id}">View</button>` : ''}
            `;

            resultsQueue.enqueue(div);

            div.addEventListener('keydown', (event) => {
                event.preventDefault();
                if (event.key == 'ArrowDown') {
                    resultsQueue.moveNext();
                    resultsQueue.getCurrent().focus();
                } else if (event.key == 'ArrowUp') {
                    resultsQueue.movePrev();
                    resultsQueue.getCurrent().focus();
                } else if (event.key == 'Enter') {
                    div.click();
                    searchInput.value = '';
                    searchInput.focus();
                }
            });

            // View auction button (if exists)
            if (result.auction_id) {
                const viewButton = div.querySelector('.view-auction');
                viewButton.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    const element = document.getElementById(`${result.auction_id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                    searchContainer.innerHTML = '';
                });
            }

            // Add to cart handler for sealed items
            div.addEventListener('click', async () => {
                addSealedToCart(sealed, result.sid, result.auction_id);
                searchContainer.innerHTML = '';
            });

        } else {
            // Handle card display
            let card = new struct()
            card.cardName = result.card_name;
            card.cardNum = result.card_num;
            card.condition = result.condition;
            card.marketValue = result.market_value;

            // Display in desired order, with proper formatting
            div.innerHTML = `
                <p class="result result-card-name">${result.card_name || 'N/A'}</p>
                <p class="result result-card-num">${result.card_num || 'N/A'}</p>
                <p class="result result-condition ${result.condition.split(' ').join('_').toLowerCase()}">${result.condition || 'Unknown'}</p>
                <p class="result result-market-value">${result.market_value ? result.market_value + '€' : 'N/A'}</p>
                <p class="result result-auction-name">${result.auction_name || result.auction_id - 1}</p>
                <button class="add-to-cart-btn">Add to cart</button>
                <button class="view-auction" data-id="${result.auction_id}">View</button>
            `;
            resultsQueue.enqueue(div);

            div.addEventListener('keydown', (event) => {
                event.preventDefault();
                if (event.key == 'ArrowDown') {
                    resultsQueue.moveNext();
                    resultsQueue.getCurrent().focus();
                } else if (event.key == 'ArrowUp') {
                    resultsQueue.movePrev();
                    resultsQueue.getCurrent().focus();
                } else if (event.key == 'Enter') {
                    div.click();
                    searchInput.value = '';
                    searchInput.focus();
                }
            });

            const viewButton = div.querySelector('.view-auction');
            viewButton.addEventListener('click', async (event) => {
                event.stopPropagation();
                const element = document.getElementById(`${result.auction_id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
                const auctionTab = element.closest('.auction-tab');
                if (auctionTab) {
                    const viewButton = auctionTab.querySelector('.view-auction');
                    if (viewButton && viewButton.textContent === 'View') {
                        await loadAuctionContent(viewButton);
                    }
                    const card = auctionTab.querySelector(`.card[data-id='${result.id}']`);
                    console.log(result.sid);
                    const sealed = auctionTab.querySelector(`.sealed-item[sid='${result.sid}']`);
                    if (card) {
                        card.scrollIntoView({ behavior: 'smooth' });
                        card.classList.add('highlighted-search-result');
                        setTimeout(() => {
                            card.classList.remove('highlighted-search-result');
                        }, 2000);
                    }
                    console.log(sealed);
                    if (sealed) {
                        sealed.scrollIntoView({ behavior: 'smooth' });
                        sealed.classList.add('highlighted-search-result');
                        setTimeout(() => {
                            sealed.classList.remove('highlighted-search-result');
                        }, 2000);
                    }
                }
                searchContainer.innerHTML = '';
            });

            div.addEventListener('click', async () => {
                addToShoppingCart(card, result.id, result.auction_id);
                searchContainer.innerHTML = '';
            });
        }

        searchContainer.appendChild(div);
    });
}

async function loadBulkHoloValues() {
    let holoVal = document.querySelector('.holo-value');
    let bulkVal = document.querySelector('.bulk-value');
    try {
        const response = await fetch('/bulkCounterValue');
        const data = await response.json();
        if (data.status == 'success') {
            bulkVal.textContent = data.bulk_counter;
            holoVal.textContent = data.holo_counter;
        } else {
            console.error("There was a problem loading bulk and holo values")
        }
    } catch (e) {
        console.error(e);
    }
}

function initializeBulkHolo() {
    loadBulkHoloValues();
}


async function loadAuctionContent(button) {
    const auctionId = button.getAttribute('data-id');
    //TODO - make this into a single endpoint
    const cardsUrl = '/loadCards/' + auctionId;
    const bulkUrl = '/loadBulk/' + auctionId;
    const sealedUrl = '/loadSealed/' + auctionId;
    const auctionDiv = button.closest('.auction-tab');
    const cardsContainer = auctionDiv.querySelector('.cards-container');
    try {
        if (cardsContainer.childElementCount === 0 || cardsContainer.style.display === 'none') {
            cardsContainer.style.display = 'flex';
            cardsContainer.style.marginLeft = '-600px';
            button.textContent = 'Hide';

            // Only fetch if we don't have content already
            if (cardsContainer.childElementCount === 0) {
                const response = await fetch(cardsUrl);
                const cards = await response.json();
                if (isEmpty(cards)) {
                    cardsContainer.innerHTML = '';
                } else {
                    cardsContainer.innerHTML = `
                    <div class="cards-header">
                        <p>Card name</p>
                        <p>Card number</p>
                        <p>Condition</p>
                        <p>Buy price</p>
                        <p>Market value</p>
                        <p>Sell price</p>
                        <p>Margin</p>
                        <p></p>
                        <p></p>
                    </div>
                `;
                    cards.forEach(card => {
                        const cardDiv = document.createElement('div');
                        cardDiv.classList.add('card');
                        cardDiv.setAttribute('data-id', card.id);
                        cardDiv.innerHTML = `
                        ${renderField(card.card_name, 'text', ['card-info', 'card-name'], 'Card Name', 'card_name')}
                        ${renderField(card.card_num, 'text', ['card-info', 'card-num'], 'Card Number', 'card_num')}
                        <p class='card-info condition ${card.condition.split(' ').join('_').toLowerCase()}' data-field="condition">${card.condition ? card.condition : 'Unknown'}</p>
                        ${renderField(card.card_price ? card.card_price + '€' : null, 'text', ['card-info', 'card-price'], 'Card Price', 'card_price')}
                        ${renderField(card.market_value ? card.market_value + '€' : null, 'text', ['card-info', 'market-value'], 'Market Value', 'market_value')}
                        ${renderField(card.sell_price ? card.sell_price + '€' : null, 'text', ['card-info', 'sell-price'], 'Sell Price', 'sell_price')}
                        ${renderField(card.card_price !== null && card.market_value !== null ? (card.market_value - card.card_price).toFixed(2) + '€' : ' ', 'text', ['card-info', 'profit'], 'profit', true)}
                        <button class="add-to-cart">Add to cart</button>
                        <span hidden class="card-id">${card.id}</span>
                        <button class=delete-card data-id="${card.id}">Delete</button>
                    `;
                        cardsContainer.appendChild(cardDiv);
                    });

                    cardsContainer.addEventListener('dblclick', (event) => {
                        if (event.target.closest('.card') && !(event.target.tagName === "DIV")) {
                            const cardDiv = event.target.closest('.card');
                            const cardId = cardDiv.querySelector('.card-id').textContent;
                            if (event.target.classList.contains('condition')) {
                                const value = event.target.textContent.trim();
                                const select = document.createElement('select');
                                const options = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];
                                const dataset = event.target.dataset.field;
                                options.forEach(option => {
                                    const opt = document.createElement('option');
                                    opt.value = option;
                                    opt.textContent = option;
                                    if (option === value) {
                                        opt.selected = true;
                                    }
                                    select.appendChild(opt);
                                });
                                event.target.replaceWith(select);
                                select.classList.add(...event.target.classList, 'select-condition');
                                select.addEventListener('change', (event) => {
                                    const selectedValue = event.target.value;
                                    const p = document.createElement('p');
                                    const classValue = selectedValue.split(' ').join('_').toLowerCase();
                                    p.classList.add('card-info', 'condition', classValue);
                                    p.textContent = selectedValue || value;
                                    select.replaceWith(p);
                                    patchValue(cardId, p.textContent, dataset);
                                });
                            }
                            if (event.target.tagName === "P") {
                                let value = event.target.textContent.replace('€', '');
                                if (isNaN(value)) {
                                    value = value.toUpperCase();
                                }
                                const dataset = event.target.dataset.field;
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.value = value;
                                input.classList.add(...event.target.classList);
                                event.target.replaceWith(input);
                                input.focus();
                                input.addEventListener('blur', async (blurEvent) => {
                                    let newValue = blurEvent.target.value.replace(',', '.');
                                    if (isNaN(newValue)) {
                                        newValue = newValue.toUpperCase();
                                    }
                                    const auctionTab = blurEvent.target.closest('.auction-tab');

                                    getInputValueAndPatch(newValue || value, input, dataset, cardId);
                                    if (blurEvent.target.classList.contains('card-price') || blurEvent.target.classList.contains('sell-price')) {
                                        await updateInventoryValueAndTotalProfit();
                                    }
                                });
                                input.addEventListener('keydown', (event) => {
                                    if (event.key === 'Enter') {
                                        input.blur();
                                    }
                                });
                            }
                        }
                    });


                    const inputFields = cardsContainer.querySelectorAll('input[type="text"]');
                    inputFields.forEach((input) => {
                        input.addEventListener('blur', async (event) => {
                            const cardId = event.target.closest('.card').querySelector('.card-id').textContent;
                            const value = event.target.value.replace(',', '.');
                            const dataset = event.target.dataset;
                            getInputValueAndPatch(value, input, dataset.field, cardId);
                            await updateInventoryValueAndTotalProfit();
                        })
                        input.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter') {
                                input.blur();
                            }
                        });
                    });

                    const addToCartButtons = cardsContainer.querySelectorAll('.add-to-cart');
                    addToCartButtons.forEach((button) => {
                        button.addEventListener('click', () => {
                            const cardDiv = button.closest('.card');
                            const cardId = cardDiv.getAttribute('data-id');
                            const auctionId = auctionDiv.getAttribute('data-id');
                            const card = new struct();
                            card.cardName = cardDiv.querySelector('.card-name').textContent;
                            card.cardNum = cardDiv.querySelector('.card-num').textContent;
                            card.condition = cardDiv.querySelector('.condition').textContent;
                            const marketValueText = cardDiv.querySelector('.market-value').textContent;
                            card.marketValue = marketValueText ? marketValueText.replace('€', '') : null;
                            addToShoppingCart(card, cardId, auctionId);
                        });
                    });

                    const deleteCard = document.querySelectorAll('.delete-card');
                    deleteCard.forEach((button) => {
                        button.addEventListener('click', async () => {
                            const cardId = button.getAttribute('data-id');
                            const cardDiv = button.closest('.card');
                            const cardsContainer = button.closest('.cards-container');
                            const auctionId = cardsContainer.closest('.auction-tab').getAttribute('data-id');
                            if (button.textContent === 'Confirm') {
                                const auctionDiv = cardsContainer.closest('.auction-tab');
                                const deleted = await removeCard(cardId, cardDiv);
                                const cards = cardsContainer.querySelectorAll('.card');
                                if (!deleted) return;
                                if (auctionDiv.classList.contains('singles')) {
                                    await updateInventoryValueAndTotalProfit()
                                    if (cardsContainer.childElementCount < 3) {
                                        const p = document.createElement('p');
                                        p.textContent = 'Empty';
                                        cardsContainer.insertBefore(p, cardsContainer.querySelector('.button-container'));
                                    }
                                } else {
                                    await changeCardPricesBasedOnAuctionPrice(auctionDiv);
                                    await updateInventoryValueAndTotalProfit();

                                }
                                if (cardsContainer.childElementCount < 3) {
                                    if (!(auctionDiv.classList.contains('singles'))) {
                                        deleteAuction(auctionId, auctionDiv);
                                    }
                                }
                            } else {
                                // First click: ask for confirmation
                                button.textContent = 'Confirm';
                                const timerID = setTimeout(() => {
                                    button.textContent = 'Delete';
                                }, 3000);
                                // Remove confirmation if user clicks elsewhere
                                document.addEventListener('click', function handler(e) {
                                    if (e.target !== button) {
                                        button.textContent = 'Delete';
                                        document.removeEventListener('click', handler);
                                        clearTimeout(timerID);
                                    }
                                });
                            }
                        });
                    });
                }

                // Load sealed items BEFORE bulk items
                try {
                    const responseSealed = await fetch(sealedUrl);
                    const sealedData = await responseSealed.json();

                    sealedData.forEach(sealedItem => {
                        const sealedDiv = document.createElement('div');
                        sealedDiv.classList.add('sealed-item');
                        sealedDiv.setAttribute('sid', sealedItem.sid);

                        const margin = (Number(sealedItem.market_value) - Number(sealedItem.price)).toFixed(2);
                        const timeStamp = sealedItem.date.replace('Z', '');
                        const date = new Date(timeStamp);
                        let formatedDate = date.toLocaleDateString('sk-SK', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });

                        sealedDiv.innerHTML = `
                            <p class="sealed-name">${sealedItem.name}</p>
                            <p class="sealed-price">${sealedItem.price}€</p>
                            <p class="sealed-market-value">${sealedItem.market_value}€</p>
                            <p class="sealed-margin">${margin}€</p>
                            <p class="sealed-date">${formatedDate}</p>
                            <button class="add-to-cart-sealed" data-sid="${sealedItem.sid}">Add to cart</button>
                            <button class="delete-sealed-item" data-sid="${sealedItem.sid}">Delete</button>
                        `;

                        cardsContainer.insertBefore(sealedDiv, cardsContainer.querySelector('.button-container'));
                    });

                    // Add event listeners for "Add to cart" buttons
                    const addToCartButtons = cardsContainer.querySelectorAll('.add-to-cart-sealed');
                    addToCartButtons.forEach((button) => {
                        button.addEventListener('click', () => {
                            const sealedDiv = button.closest('.sealed-item');
                            const sid = sealedDiv.getAttribute('sid');
                            const auctionId = auctionDiv.getAttribute('data-id');

                            const sealedData = {
                                name: sealedDiv.querySelector('.sealed-name').textContent,
                                market_value: sealedDiv.querySelector('.sealed-market-value').textContent.replace('€', '')
                            };

                            addSealedToCart(sealedData, sid, auctionId);
                        });
                    });

                    // Add event listeners for "Delete" buttons
                    const deleteSealedButtons = cardsContainer.querySelectorAll('.delete-sealed-item');
                    deleteSealedButtons.forEach((button) => {
                        button.addEventListener('click', async () => {
                            const sid = button.getAttribute('data-sid');
                            const sealedDiv = button.closest('.sealed-item');

                            if (button.textContent === 'Confirm') {
                                const response = await fetch(`/deleteSealed/${sid}`, { method: 'DELETE' });
                                const data = await response.json();

                                if (data.status === 'success') {
                                    sealedDiv.remove();
                                }
                            } else {
                                button.textContent = 'Confirm';
                                const timerID = setTimeout(() => {
                                    button.textContent = 'Delete';
                                }, 3000);

                                document.addEventListener('click', function handler(e) {
                                    if (e.target !== button) {
                                        button.textContent = 'Delete';
                                        document.removeEventListener('click', handler);
                                        clearTimeout(timerID);
                                    }
                                });
                            }
                        });
                    });

                } catch (error) {
                    console.error('Error loading sealed items:', error);
                }

                // Load bulk items
                try {
                    const responseBulk = await fetch(bulkUrl);
                    const bulkData = await responseBulk.json();
                    bulkData.forEach(bulkItem => {
                        const bulkDiv = document.createElement('div');
                        bulkDiv.classList.add('bulk-item');
                        bulkDiv.setAttribute('data-id', bulkItem.id);
                        bulkDiv.innerHTML = `
                            <p class="bulk-name">${bulkItem.item_type}</p>
                            <p class="bulk-quantity">Quantity: ${bulkItem.quantity}</p>
                            <p class="bulk-sell-price">Sell Price: ${bulkItem.total_price ? bulkItem.total_price + '€' : 'N/A'}</p>
                            <button class="delete-bulk-item" data-id="${bulkItem.id}">Delete</button>
                        `;
                        cardsContainer.insertBefore(bulkDiv, cardsContainer.querySelector('.button-container'));
                    }
                    );
                    const deleteBulkButtons = cardsContainer.querySelectorAll('.delete-bulk-item');
                    deleteBulkButtons.forEach((button) => {
                        button.addEventListener('click', async () => {
                            const bulkId = button.getAttribute('data-id');
                            const bulkDiv = button.closest('.bulk-item');
                            const cardsContainer = button.closest('.cards-container');
                            const auctionId = cardsContainer.closest('.auction-tab').getAttribute('data-id');
                            if (button.textContent === 'Confirm') {
                                const deleted = await removeBulkItem(bulkId, bulkDiv);
                                if (!deleted) return;
                            } else {
                                // First click: ask for confirmation
                                button.textContent = 'Confirm';
                                const timerID = setTimeout(() => {
                                    button.textContent = 'Delete';
                                }, 3000);
                                // Remove confirmation if user clicks elsewhere
                                document.addEventListener('click', function handler(e) {
                                    if (e.target !== button) {
                                        button.textContent = 'Delete';
                                        document.removeEventListener('click', handler);
                                        clearTimeout(timerID);
                                    }
                                });
                            }
                        });
                    });

                } catch (error) {
                    console.error('Error loading bulk items:', error);
                }
            }
        } else {
            cardsContainer.style.display = 'none';
            button.textContent = 'View';
        }
    } catch (error) {
        console.error('Error loading cards:', error);
    }

    // Only add button container if it doesn't exist
    if (!cardsContainer.querySelector('.button-container')) {
        const buttonDiv = document.createElement('div');
        buttonDiv.classList.add('button-container');
        buttonDiv.innerHTML = `
                <div><button class="add-cards-auction">Add cards</button></div>
                <div><button class="add-sealed-auction">Add sealed</button></div>
                <div><button class="add-bulk-auction">Add bulk</button></div>
                <div><button class="add-holo-auction">Add holo</button></div>
                <div><button class="save-added-cards">Save</button></div>
                `;
        cardsContainer.appendChild(buttonDiv);
        cardsContainer.querySelector('.save-added-cards').hidden = true;

        const addCardButton = cardsContainer.querySelector('.add-cards-auction');
        addCardButton.addEventListener('click', () => {
            cardsContainer.querySelector('.save-added-cards').hidden = false;
            const newCard = document.createElement('div');
            newCard.classList.add('card', 'new-card');
            newCard.innerHTML = `
                ${renderField(null, 'text', ['card-info', 'card-name'], 'Card Name', 'card_name')}
                ${renderField(null, 'text', ['card-info', 'card-num'], 'Card Number', 'card_num')}
                <select class="card-info condition select-condition" data-field="condition">
                    <option value="Mint">Mint</option>
                    <option value="Near Mint" selected="selected">Near Mint</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Light Played">Light Played</option>
                    <option value="Played">Played</option>
                    <option value="Poor">Poor</option>
                </select>
                ${renderField(null, 'text', ['card-info', 'card-price'], 'Card Price', 'card_price')}
                ${renderField(null, 'text', ['card-info', 'market-value'], 'Market Value', 'market_value')}
                ${renderField(null, 'text', ['card-info', 'sell-price'], 'Sell Price', 'sell_price')}`;
            cardsContainer.insertBefore(newCard, cardsContainer.querySelector('.button-container'));
        });

        const addBulkButton = cardsContainer.querySelector('.add-bulk-auction');
        addBulkButton.addEventListener('click', () => {
            cardsContainer.querySelector('.save-added-cards').hidden = false;
            const bulkDiv = cardsContainer.querySelector('.add-bulk-item');
            if (!bulkDiv) {
                const newBulkDiv = document.createElement('div');
                newBulkDiv.classList.add('add-bulk-item');
                newBulkDiv.innerHTML = `
                    <p class="bulk-name">Bulk Item</p>
                    <p class="bulk-quantity">Quantity: <input type="number" class="bulk-quantity-input" min="1"></p>
                    <p class="bulk-sell-price">Sell Price: <input type="text" class="bulk-sell-price-input" ></p>
    
                `;
                cardsContainer.insertBefore(newBulkDiv, cardsContainer.querySelector('.button-container'));
            }
        });

        const addSealedButton = cardsContainer.querySelector('.add-sealed-auction');
        addSealedButton.addEventListener('click', () => {
            cardsContainer.querySelector('.save-added-cards').hidden = false;

            // Create input form for new sealed item
            const newSealedDiv = document.createElement('div');
            newSealedDiv.classList.add('add-sealed-item');

            const currentDate = new Date().toISOString().split('T')[0];

            newSealedDiv.innerHTML = `
                <input type="text" class="sealed-name-input" placeholder="Sealed item name">
                <input type="number" class="sealed-price-input" placeholder="Price" step="0.01" min="0">
                <input type="number" class="sealed-market-value-input" placeholder="Market value" step="0.01" min="0">
                <input type="date" class="sealed-date-input" value="${currentDate}" max="${currentDate}">
                <button class="remove-sealed-input">×</button>
            `;

            cardsContainer.insertBefore(newSealedDiv, cardsContainer.querySelector('.button-container'));

            // Add remove button functionality
            const removeBtn = newSealedDiv.querySelector('.remove-sealed-input');
            removeBtn.addEventListener('click', () => {
                newSealedDiv.remove();

                // Hide save button if no new items
                const hasNewItems = cardsContainer.querySelector('.new-card') ||
                    cardsContainer.querySelector('.add-sealed-item') ||
                    cardsContainer.querySelector('.add-bulk-item') ||
                    cardsContainer.querySelector('.add-holo-item');
                if (!hasNewItems) {
                    cardsContainer.querySelector('.save-added-cards').hidden = true;
                }
            });
        });

        const addHoloButton = cardsContainer.querySelector('.add-holo-auction');
        addHoloButton.addEventListener('click', () => {
            cardsContainer.querySelector('.save-added-cards').hidden = false;
            const holoDiv = cardsContainer.querySelector('.add-holo-item');
            if (!holoDiv) {
                const newHoloDiv = document.createElement('div');
                newHoloDiv.classList.add('add-holo-item');
                newHoloDiv.innerHTML = `
                    <p class="holo-name">Holo Item</p>
                    <p class="holo-quantity">Quantity: <input type="number" class="holo-quantity-input" min="1"></p>
                    <p class="holo-sell-price">Sell Price: <input type="text" class="holo-sell-price-input" ></p>
                `;
                cardsContainer.insertBefore(newHoloDiv, cardsContainer.querySelector('.button-container'));
            }
        });

        const saveAddedCardButton = cardsContainer.querySelector('.save-added-cards');
        saveAddedCardButton.addEventListener('click', async () => {
            const itemsToAdd = {};
            saveAddedCardButton.hidden = true;
            const auctionId = auctionDiv.getAttribute('data-id');
            let cardsArray = [];
            const newCards = cardsContainer.querySelectorAll('.new-card');
            try {
                newCards.forEach(async (card) => {
                    let cardObj = new struct();
                    cardObj.cardName = card.querySelector('input.card-name').value.trim().toUpperCase() || null;
                    cardObj.cardNum = card.querySelector('input.card-num').value.trim().toUpperCase() || null;
                    cardObj.condition = card.querySelector('select.condition').value || null;
                    cardObj.buyPrice = card.querySelector('input.card-price').value.replace(',', '.').trim() || null;
                    cardObj.marketValue = card.querySelector('input.market-value').value.replace(',', '.').trim() || null;
                    cardObj.sellPrice = card.querySelector('input.sell-price').value.replace(',', '.').trim() || null;
                    cardObj.soldDate = null;

                    if (cardObj.buyPrice === null) cardObj.buyPrice = cardObj.marketValue * 0.85;
                    if (cardObj.sellPrice === null) cardObj.sellPrice = cardObj.marketValue;
                    if (cardObj.cardName !== null && cardObj.marketValue !== null) {
                        cardsArray.push(cardObj);
                    } else {
                        card.remove();
                    }
                });

                itemsToAdd['cards'] = cardsArray;

                const auctionSingles = auctionDiv.classList.contains('singles') ? true : false;
                for (let i = 0; i < cardsArray.length; i++) {
                    let j = 0;
                    for (const [key, value] of Object.entries(cardsArray[i])) {
                        if (key === 'soldDate') continue;
                        const cardElement = newCards[i].children;
                        replaceWithPElement(cardElement[j].dataset.field, value, cardElement[j]);
                        j++;
                    }
                }

                const bulkDiv = cardsContainer.querySelector('.add-bulk-item');
                if (bulkDiv) {
                    const bulkItems = { 'item_type': 'bulk', 'quantity': null, 'total_price': null };
                    bulkItems.quantity = bulkDiv.querySelector('.bulk-quantity-input').value.trim() || null;
                    bulkItems.total_price = bulkDiv.querySelector('.bulk-sell-price-input').value.trim() || null;
                    bulkItems.unit_price = bulkItems.total_price / bulkItems.quantity || null;
                    itemsToAdd['bulk'] = bulkItems;
                }

                const holoDiv = cardsContainer.querySelector('.add-holo-item');
                if (holoDiv) {
                    const holoItems = { 'item_type': 'holo', 'quantity': null, 'total_price': null };
                    holoItems.quantity = holoDiv.querySelector('.holo-quantity-input').value.trim() || null;
                    holoItems.total_price = holoDiv.querySelector('.holo-sell-price-input').value.trim() || null;
                    holoItems.unit_price = holoItems.total_price / holoItems.quantity || null;
                    itemsToAdd['holo'] = holoItems;
                }

                // Handle sealed items
                const sealedDivs = cardsContainer.querySelectorAll('.add-sealed-item');
                if (sealedDivs.length > 0) {
                    const sealedItems = [];
                    sealedDivs.forEach(sealedDiv => {
                        const name = sealedDiv.querySelector('.sealed-name-input').value.trim() || null;
                        const price = sealedDiv.querySelector('.sealed-price-input').value.trim() || null;
                        const marketValue = sealedDiv.querySelector('.sealed-market-value-input').value.trim() || null;
                        const date = sealedDiv.querySelector('.sealed-date-input').value || null;

                        if (name !== null && marketValue !== null) {
                            sealedItems.push({
                                name: name,
                                price: price,
                                market_value: marketValue,
                                date: date
                            });
                        }
                    });

                    if (sealedItems.length > 0) {
                        itemsToAdd['sealed'] = sealedItems;
                    }
                }


                const jsonbody = JSON.stringify(itemsToAdd);
                const response = await fetch(`/addToExistingAuction/${auctionId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: jsonbody
                });
                const data = await response.json();
                if (!(data.status === 'success')) {
                    console.error('Error saving new cards:', data);
                    return;
                }
                if (auctionSingles) {
                    await updateInventoryValueAndTotalProfit();
                } else {
                    const auctionTab = cardsContainer.closest('.auction-tab');
                    const cards = cardsContainer.querySelectorAll('.card');
                    await setAuctionBuyPrice(cards, auctionTab);

                    await updateInventoryValueAndTotalProfit();
                }

                newCards.forEach(card => card.classList.remove('new-card'));
            } catch (error) {
                console.error('Error saving new cards:', error);
                return;
            }
            //this could be done better by dynamically adding the cards instead of reloading the whole auction
            window.location.reload();
        });
    }
}

async function initializeSealed() {
    const sealedContainer = document.querySelector('.sealed-container');
    const sealedTab = sealedContainer.querySelector('.sealed-tab');
    const viewButton = sealedContainer.querySelector('.view-sealed');
    viewButton.addEventListener('click', () => {
        loadSealed(viewButton);
    });

}

async function loadSealed(viewButton) {
    const sealedTab = document.querySelector('.sealed-tab');
    const contentDiv = document.querySelector('.sealed-tab-content')
    if (sealedTab.style.display === 'none' || sealedTab.childElementCount === 0) {
        sealedTab.style.display = 'flex';
        sealedTab.style.marginLeft = '-600px';
        viewButton.innerHTML = 'Hide';

        // Only fetch if we don't have items already
        if (sealedTab.childElementCount === 3) {
            try {
                const response = await fetch('/loadSealed');
                const data = await response.json();
                if (data.status != 'success') {
                    console.error('Failed to load sealed products');
                    return;
                }

                data.data.forEach((sealedData) => {
                    const sealedDiv = document.createElement('div');
                    sealedDiv.classList.add('sealed-item');
                    sealedDiv.setAttribute('sid', sealedData.sid);
                    const margin = Number(sealedData.price) - Number(sealedData.market_value);
                    const timeStamp = sealedData.date.replace('Z', '');
                    const date = new Date(timeStamp);
                    let formatedDate = date.toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    sealedDiv.innerHTML = `
                        <p class='sealed-name'>${sealedData.name}</p>
                        <p class='unit-price'>${sealedData.price}</p>
                        <p class='market-value-sealed'>${sealedData.market_value}</p>
                        <p class='margin'>${margin}</p>
                        <p class='add-date'>${formatedDate}</p>
                        <button class='add-to-cart'>Add to cart</button>
                        <button class='delete-sealed'>Delete</button>
                        `

                    const addToCart = sealedDiv.querySelector('.add-to-cart');
                    addToCart.addEventListener('click', () => {
                        addSealedToCart(sealedData, sealedData.sid)
                    });

                    const removeSealed = sealedDiv.querySelector('.delete-sealed');
                    removeSealed.addEventListener('click', async () => {

                        if (removeSealed.textContent === 'Confirm') {
                            const response = await fetch(`/deleteSealed/${sealedData.sid}`, { method: 'DELETE' })
                            const data = await response.json();

                            if (data.status === 'success') {
                                sealedDiv.remove();
                            }
                        } else {
                            removeSealed.textContent = 'Confirm';
                            const timerID = setTimeout(() => {
                                removeSealed.textContent = 'Delete';
                            }, 3000);
                            // Remove confirmation if user clicks elsewhere
                            document.addEventListener('click', function handler(e) {
                                if (e.target !== removeSealed) {
                                    removeSealed.textContent = 'Delete';
                                    document.removeEventListener('click', handler);
                                    clearTimeout(timerID);
                                }
                            });
                        }
                    });
                    contentDiv.append(sealedDiv);
                })


                const buttonsContainer = document.querySelector('.buttons-container')

                const addButton = buttonsContainer.querySelector('.add-sealed');
                const date = new Date().toJSON().split('T')[0]
                addButton.addEventListener('click', () => {
                    const div = document.createElement('div');
                    div.classList.add('add-sealed');
                    div.innerHTML = `
                            <input type='text' placeholder='name'></input>
                            <input type='number' placeholder='price'></input>
                            <input type='number' placeholder='market value'></input>
                            <p></p>
                            <input type='date' value=${date} max=${date} ></input>
                        `
                    contentDiv.append(div);

                    const saveButton = buttonsContainer.querySelector('.save-sealed-btn');
                    saveButton.style.display = 'block';

                });

                const saveButton = buttonsContainer.querySelector('.save-sealed-btn');
                saveButton.addEventListener('click', async () => {
                    const inputDivs = contentDiv.querySelectorAll('.add-sealed');
                    let inputValues = []
                    inputDivs.forEach(div => {
                        const inputs = div.querySelectorAll('input');
                        const row = {};
                        row.name = inputs[0].value || null;
                        row.price = inputs[1].value || null;
                        row.market_value = inputs[2].value || null;
                        row.dateAdded = inputs[3].value;
                        if (row.name !== null && row.market_value !== null) {
                            inputValues.push(row);
                        }
                    })
                    saveButton.style.display = 'none';
                    if (inputValues.length > 0) {
                        const response = await fetch('/addSealed', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(inputValues)
                        });
                        const data = await response.json();
                        if (data.status === 'success') {
                            window.location.reload()
                        } else {
                            console.error(data.message)
                            inputDivs.forEach(div => {
                                div.remove();
                            });
                        }
                    }
                })

            }
            catch (e) {
                console.log('Error:', e);
            }
        }
    } else {
        sealedTab.style.display = 'none'
        viewButton.innerHTML = 'View';
    }
}

async function loadAuctions() {
    const auctionContainer = document.querySelector('.auction-container');
    try {
        const response = await fetch('/loadAuctions');
        const data = await response.json();
        data.forEach(auction => {
            const auctionDiv = document.createElement('div');
            auctionDiv.classList.add('auction-tab');
            auctionDiv.id = `${auction.id}`;
            if (auction.auction_name === 'Singles') {
                auctionDiv.classList.add('singles');
            }
            auctionDiv.setAttribute('data-id', auction.id);
            let auctionName = auction.auction_name || "Auction " + (auction.id - 1); // Fallback for name
            let auctionPrice = auction.auction_price || null; // Fallback for buy price
            const buyDate = new Date(auction.date_created);
            let formatedDate = buyDate.toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (formatedDate === 'Invalid Date') {
                formatedDate = new Date(String(auction.date_created).split('T')[0]).toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });;
            }

            // Parse payment methods
            const payments = parsePaymentMethods(auction.payment_method);
            const paymentDisplay = formatPaymentDisplay(payments);

            auctionDiv.innerHTML = `
                <p class="auction-name">${auctionName}</p>
                ${renderField(auctionPrice != null ? auctionPrice + '€' : null, 'text', ['auction-price'], 'Auction Buy Price', 'auction_price')}
                <p class="buy-date">${formatedDate || dateFromUTC}</p>
                <div class="payment-method-container">
                    <div class="payment-method">${paymentDisplay}</div>
                    <button class="edit-payments-btn">Edit</button>
                </div>
                <button class="view-auction" data-id="${auction.id}">View</button>
                <button class="delete-auction" data-id="${auction.id}">Delete</button>
                <div class="cards-container">
                    <!-- Cards will be loaded here -->
                </div>
            `;
            auctionContainer.appendChild(auctionDiv);

            // Store payments data on the div for later use
            auctionDiv.paymentsData = payments;
        });

        // Handle payment editing - define as named function to allow re-attachment
        const handleEditPayment = (event) => {
            const auctionDiv = event.target.closest('.auction-tab');
            const auctionId = auctionDiv.getAttribute('data-id');
            const paymentContainer = auctionDiv.querySelector('.payment-method-container');
            const payments = auctionDiv.paymentsData || [];

            // Clear container and create payment editor
            paymentContainer.innerHTML = '<div class="payment-rows-container"></div>';
            const rowsContainer = paymentContainer.querySelector('.payment-rows-container');

            // Add existing payments
            if (payments.length > 0) {
                payments.forEach(payment => {
                    rowsContainer.innerHTML += paymentTypeRow(payment.type, payment.amount);
                });
            } else {
                // Add one empty row if no payments
                rowsContainer.innerHTML += paymentTypeRow();
            }

            // Add control buttons (create elements instead of innerHTML to preserve rowsContainer reference)
            const buttonsDiv = document.createElement('div');
            buttonsDiv.classList.add('payment-buttons-container');
            buttonsDiv.innerHTML = `
                <button class="add-payment-row-btn">+</button>
                <button class="save-payments-btn">Save</button>
                <button class="cancel-payments-btn">Cancel</button>
            `;
            paymentContainer.appendChild(buttonsDiv);

            // Attach remove button listeners
            const attachRemoveListeners = () => {
                const removeButtons = rowsContainer.querySelectorAll('.remove-payment-btn');
                removeButtons.forEach(btn => {
                    btn.onclick = () => {
                        if (rowsContainer.children.length > 1) {
                            btn.closest('.payment-row').remove();
                        } else {
                            alert('At least one payment row is required');
                        }
                    };
                });
            };
            attachRemoveListeners();

            // Add payment row button
            paymentContainer.querySelector('.add-payment-row-btn').addEventListener('click', () => {
                rowsContainer.innerHTML += paymentTypeRow();
                attachRemoveListeners();
            });

            // Save button
            paymentContainer.querySelector('.save-payments-btn').addEventListener('click', async () => {
                const paymentRows = rowsContainer.querySelectorAll('.payment-row');
                const paymentsArray = [];
                let hasEmptyType = false;

                paymentRows.forEach(row => {
                    const type = row.querySelector('.payment-type-select').value;
                    const amount = parseFloat(row.querySelector('.payment-amount-input').value) || 0;

                    if (!type || type.trim() === '') {
                        hasEmptyType = true;
                    } else {
                        paymentsArray.push({ type, amount });
                    }
                });

                if (hasEmptyType && paymentsArray.length === 0) {
                    alert('Please select at least one payment type');
                    return;
                }

                // Validate payments
                const validation = validatePayments(paymentsArray);
                if (!validation.valid) {
                    alert(validation.error);
                    return;
                }

                const success = await updatePaymentMethod(auctionId, paymentsArray);
                if (success) {
                    // Update display
                    auctionDiv.paymentsData = paymentsArray;
                    const paymentDisplay = formatPaymentDisplay(paymentsArray);
                    paymentContainer.innerHTML = `
                        <div class="payment-method">${paymentDisplay}</div>
                        <button class="edit-payments-btn">Edit</button>
                    `;
                    // Re-attach listener to new edit button
                    paymentContainer.querySelector('.edit-payments-btn').addEventListener('click', handleEditPayment);
                } else {
                    alert('Failed to update payment methods. Please try again.');
                }
            });

            // Cancel button
            paymentContainer.querySelector('.cancel-payments-btn').addEventListener('click', () => {
                const paymentDisplay = formatPaymentDisplay(auctionDiv.paymentsData || []);
                paymentContainer.innerHTML = `
                    <div class="payment-method">${paymentDisplay}</div>
                    <button class="edit-payments-btn">Edit</button>
                `;
                // Re-attach listener to new edit button
                paymentContainer.querySelector('.edit-payments-btn').addEventListener('click', handleEditPayment);
            });
        };

        const editPaymentButtons = document.querySelectorAll('.edit-payments-btn');
        editPaymentButtons.forEach((button) => {
            button.addEventListener('click', handleEditPayment);
        });

        const auctionPriceInputs = document.querySelectorAll('input.auction-price');
        auctionPriceInputs.forEach(input => {
            input.addEventListener('blur', (event) => {
                const value = event.target.value.replace(',', '.');
                const auctionDiv = event.target.closest('.auction-tab');
                const auctionId = auctionDiv.getAttribute('data-id');
                if (!Boolean(value)) {
                    return;
                }
                updateAuction(auctionId, value, 'auction_price');
                const p = document.createElement('p');
                p.classList.add('auction-price');
                p.textContent = appendEuroSign(value, 'auction_price');
                event.target.replaceWith(p);


            })
            input.addEventListener('keydown', (event) => {
                if (event.key == 'Enter') {
                    input.blur();
                }
            })
        })

        const attachAuctionNameListener = (name) => {
            if (name.textContent === 'Singles') {
                return;
            }
            name.addEventListener('dblclick', (event) => {
                const value = event.target.textContent.replace('€', '');
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.classList.add(...event.target.classList);
                event.target.replaceWith(input);
                input.focus();
                input.addEventListener('blur', (blurEvent) => {
                    const value = blurEvent.target.value;
                    const auctionDiv = blurEvent.target.closest('.auction-tab');
                    const auctionId = auctionDiv.getAttribute('data-id');
                    if (!Boolean(value)) {
                        return;
                    }
                    updateAuction(auctionId, value, 'auction_name');
                    const p = document.createElement('p');
                    p.classList.add('auction-name');
                    p.textContent = value;
                    blurEvent.target.replaceWith(p);
                    attachAuctionNameListener(p);
                })
                input.addEventListener('keydown', (keyEvent) => {
                    if (keyEvent.key == 'Enter') {
                        input.blur();
                    }
                });
            });
        };

        const auctionNames = document.querySelectorAll('.auction-name');
        auctionNames.forEach(name => attachAuctionNameListener(name));

        const attachAuctionPriceListener = (price) => {
            price.addEventListener('dblclick', (event) => {
                const value = event.target.textContent.replace('€', '');
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.classList.add(...event.target.classList);
                event.target.replaceWith(input);
                input.focus();
                input.addEventListener('blur', async (blurEvent) => {
                    let value = blurEvent.target.value.replace(',', '.');
                    if (isNaN(value)) {
                        value = value.toUpperCase();
                    }
                    const auctionDiv = blurEvent.target.closest('.auction-tab');
                    const auctionId = auctionDiv.getAttribute('data-id');
                    if (!Boolean(value)) {
                        return;
                    }
                    await updateAuction(auctionId, value, 'auction_price');
                    const p = document.createElement('p');
                    p.classList.add('auction-price');
                    p.textContent = appendEuroSign(value, 'auction_price');
                    blurEvent.target.replaceWith(p);
                    changeCardPricesBasedOnAuctionPrice(auctionDiv);
                    attachAuctionPriceListener(p);
                })
                input.addEventListener('keydown', (keyEvent) => {
                    if (keyEvent.key == 'Enter') {
                        input.blur();
                    }
                })
            });
        };

        const auctionPrices = document.querySelectorAll('.auction-price');
        auctionPrices.forEach(price => attachAuctionPriceListener(price));

        //Attach event listener for changing date
        const auctionDateListener = (date) => {
            date.addEventListener('dblclick', (event) => {
                const currValue = event.target.textContent;
                const input = document.createElement('INPUT');
                input.type = 'date';
                const maxDate = new Date().toISOString().split("T")[0];
                input.max = `${maxDate}`;
                const [day, month, year] = currValue.split(". ").map(s => s.trim());
                const dateValue = `${year}-${month}-${day}`;
                input.value = dateValue;
                input.classList.add(...event.target.classList);
                event.target.replaceWith(input);
                input.focus();

                input.addEventListener('blur', async (blurEvent) => {
                    let value = blurEvent.target.value;
                    console.log(value);
                    const auctionDiv = blurEvent.target.closest('.auction-tab');
                    const auctionId = auctionDiv.getAttribute('data-id');
                    if (!Boolean(value)) {
                        return;
                    }
                    await updateAuction(auctionId, value, 'date_created');
                    const p = document.createElement('p');

                    value = new Date(value);
                    let formatedDate = value.toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    p.textContent = formatedDate;
                    p.classList.add('buy-date');
                    blurEvent.target.replaceWith(p);
                    auctionDateListener(p);
                });
                input.addEventListener('keydown', (keyEvent) => {
                    if (keyEvent.key === 'Enter') {
                        input.blur();
                    }
                })
            });
        }

        const dateElements = document.querySelectorAll('.buy-date');
        dateElements.forEach(date => auctionDateListener(date));
        // Attach event listeners after auctions are loaded
        const viewButtons = document.querySelectorAll('.view-auction');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => loadAuctionContent(button));
        });

        const auctionsTabs = document.querySelectorAll('.auction-tab');
        auctionsTabs.forEach(tab => {
            tab.addEventListener('click', async (event) => {
                // Only trigger if the click is on the tab itself, not its children
                if (event.target === tab) {
                    const viewButton = tab.querySelector('.view-auction');
                    if (viewButton) {
                        loadAuctionContent(viewButton);
                    }
                }
            });
        });


        const auctionTab = document.querySelectorAll('.auction-tab');
        auctionTab.forEach((tab) => {
            const paymentMethodSelects = tab.querySelectorAll('.payment-method-select');
            if (paymentMethodSelects) {
                paymentMethodSelects.forEach(select => {
                    attachPaymentMethodSelectListener(select);
                });

            }
        });


        const deleteButton = document.querySelectorAll('.delete-auction');
        deleteButton.forEach(button => {
            button.addEventListener('click', () => {
                const auctionId = button.getAttribute('data-id');
                if (auctionId != 1) {
                    if (button.textContent === 'Confirm') {
                        const auctionDiv = button.closest('.auction-tab');
                        deleteAuction(auctionId, auctionDiv);
                        updateInventoryValueAndTotalProfit()
                    } else {
                        button.textContent = 'Confirm';
                        const timerID = setTimeout(() => {
                            button.textContent = 'Delete';
                        }, 3000);
                        // Remove confirmation if user clicks elsewhere
                        document.addEventListener('click', function handler(e) {
                            if (e.target !== button) {
                                button.textContent = 'Delete';
                                document.removeEventListener('click', handler);
                                clearTimeout(timerID);
                            }
                        });
                    }

                }
            });
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }
}



if (document.title === "Trade Tracker") {
    searchBar();
    loadAuctions();
    initializeSealed();
    importCSV();
    soldReportBtn();
    initializeCart();
    initializeBulkHolo();
    loadCartContentFromSession();
    document.addEventListener('DOMContentLoaded', async () => {
        await updateInventoryValueAndTotalProfit();
    }, false);
}
