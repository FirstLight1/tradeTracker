import { renderField } from "./main.js";

async function loadContent(){
    const response = await fetch('/loadSoldCards');
    const soldCards = await response.json();
    const cardsContainer = document.querySelector('.cards-container');
    soldCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        const soldDate = new Date(card.sold_date);
        const formattedDate = `${soldDate.getDate().toString().padStart(2, '0')}.${(soldDate.getMonth() + 1).toString().padStart(2, '0')}.${soldDate.getFullYear()}`;
        
        cardElement.innerHTML = `
            ${renderField(card.card_name, 'text', ['card-info', 'card-name'], 'Card Name', 'card_name')}
            ${renderField(card.card_num, 'text', ['card-info', 'card-num'], 'Card Number', 'card_num')}
            <p class='card-info condition' data-field="condition">${card.condition ? card.condition : 'Unknown'}</p>
            ${renderField(card.card_price ? card.card_price + '€' : null, 'text', ['card-info', 'card-price'], 'Card Price', 'card_price')}
            ${renderField(card.market_value ? card.market_value + '€' : null, 'text', ['card-info', 'market-value'], 'Market Value', 'market_value')}
            ${renderField(card.sell_price ? card.sell_price + '€' : null, 'text', ['card-info', 'sell-price'], 'Sell Price', 'sell_price')}
            <input type="checkbox" class='card-info-checkbox sold' ${card.sold ? 'checked' : ''} data-field="sold">
            <input type="checkbox" class='card-info-checkbox sold-cm' ${card.sold_cm ? 'checked' : '' } data-field="sold_cm">
            <p>${formattedDate}</p>
            <span hidden class = "card-id">${card.id}</span>
            <button class=delete-card data-id="${card.id}">Delete</button>
        `;
        cardsContainer.appendChild(cardElement);
        const deleteButton = cardElement.querySelector('.delete-card');
        deleteButton.addEventListener('click', async () => {
            const cardId = deleteButton.getAttribute('data-id');
            console.log('Deleting card with ID:', cardId);
            const deleteResponse = await fetch('/deleteCard/' + cardId, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (deleteResponse.ok) {
                cardsContainer.removeChild(cardElement);
            }
        });
    });
}
loadContent();