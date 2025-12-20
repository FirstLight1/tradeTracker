import { renderField } from "./main.js";

async function loadContent(button){
    const saleId = button.getAttribute('data-id');
    const saleEntry = button.closest('.auction-tab');
    const cardsContainer = saleEntry.querySelector('.cards-container');
    
    if (cardsContainer.childElementCount === 0 || cardsContainer.style.display === 'none'){
        const response = await fetch('/loadSoldCards/' + saleId);
        const soldItems = await response.json();
        cardsContainer.style.display = 'flex';
        cardsContainer.style.marginLeft = '-400px';
        button.textContent = 'Hide';
        
        if(soldItems.length === 0){
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
                    <p>Sold Date</p>
                </div>
            `;
            const soldCards = soldItems.cards;
            const bulkSales = soldItems.bulk_sales;
            const soldDate = new Date(soldCards[0].sold_date);

            soldCards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.classList.add('card');
                const formattedDate = `${soldDate.getDate().toString().padStart(2, '0')}.${(soldDate.getMonth() + 1).toString().padStart(2, '0')}.${soldDate.getFullYear()}`;
                
                cardElement.innerHTML = `
                    ${renderField(card.card_name, 'text', ['card-info', 'card-name'], 'Card Name', 'card_name')}
                    ${renderField(card.card_num, 'text', ['card-info', 'card-num'], 'Card Number', 'card_num')}
                    <p class='card-info condition' data-field="condition">${card.condition ? card.condition : 'Unknown'}</p>
                    ${renderField(card.card_price ? card.card_price + '€' : null, 'text', ['card-info', 'card-price'], 'Card Price', 'card_price')}
                    ${renderField(card.market_value ? card.market_value + '€' : null, 'text', ['card-info', 'market-value'], 'Market Value', 'market_value')}
                    ${renderField(card.sell_price ? card.sell_price + '€' : null, 'text', ['card-info', 'sell-price'], 'Sell Price', 'sell_price')}
                    <p>Marža: ${card.sell_price && card.card_price ? (card.sell_price - card.card_price).toFixed(2) + '€' : 'Unknown'}</p>
                    <p>${formattedDate}</p>
                    <span hidden class = "card-id">${card.id}</span>
                `;
                cardsContainer.appendChild(cardElement);
            });
            bulkSales.forEach(bulk => {
                const bulkElement = document.createElement('div');
                bulkElement.classList.add('card');
                const formattedDate = `${soldDate.getDate().toString().padStart(2, '0')}.${(soldDate.getMonth() + 1).toString().padStart(2, '0')}.${soldDate.getFullYear()}`;
                bulkElement.innerHTML = `
                    <p class='card-info card-name'>${bulk.item_type}</p>
                    <p class='card-info card-num'></p>
                    <p class='card-info condition'></p>
                    <p class='card-info card-price'></p>
                    <p class='card-info market-value'>Počet: ${bulk.quantity}</p>
                    <p class='card-info sell-price'>${bulk.total_price != null ? bulk.total_price + '€' : 'Unknown'}</p>
                    <p>Marža: ${bulk.total_price !== null && bulk.quantity !== null && bulk.unit_price !== null ? (bulk.total_price - bulk.quantity * bulk.unit_price).toFixed(2) + '€' : 'Unknown'}</p>
                    <p>${formattedDate}</p>
                    <span hidden class = "bulk-id">${bulk.id}</span>
                `;
                cardsContainer.appendChild(bulkElement);
            });
        }
    } else {
        cardsContainer.style.display = 'none';
        button.textContent = 'View';
    }
}

async function loadHistory(){
    const response = await fetch('/loadSoldHistory');
    const sales = await response.json();
    const historyContainer = document.querySelector('.sales-history-container');
    sales.forEach(sale => {
        const saleElement = document.createElement('div');
        saleElement.classList.add('sold-tab');
        saleElement.classList.add('auction-tab');
        saleElement.id = `${sale.id}`;
        saleElement.setAttribute('data-id', sale.id);
        const saleDate = new Date(sale.sale_date);
        const formattedDate = `${saleDate.getDate().toString().padStart(2, '0')}.${(saleDate.getMonth() + 1).toString().padStart(2, '0')}.${saleDate.getFullYear()}`;
        saleElement.innerHTML = `
            <p class="auction-name">Invoice #${sale.invoice_number} - ${formattedDate}</p>
            <p class="auction-price">Celková suma: ${sale.total_amount}€</p>
            <p>Marža: ${sale.total_profit ? sale.total_profit.toFixed(2) : '0.00'}€</p>
            <p>${sale.notes ? sale.notes : 'None'}</p>
            <button class="view-auction" data-id="${sale.id}">View</button>
            <div class="cards-container">
                <!-- Cards will be loaded here -->
            </div>
        `;
        historyContainer.appendChild(saleElement);
        
        const viewButton = saleElement.querySelector('.view-auction');
        viewButton.addEventListener('click', () => {
            loadContent(viewButton);
        });
        saleElement.addEventListener('click', (event) => {
            if(event.target !== viewButton){
                loadContent(viewButton);
            }
        });
    });
}

loadHistory();