import {renderField, appendEuroSign, replaceWithPElement, getInputValueAndPatch} from './main.js';

function removeCard(id, div){
    try{
        fetch(`/deleteFromCollection/${id}`, {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => {
            if(data.status === 'success'){
                div.remove()
            } else{
                console.error('failed to remove card', data)
            }
        })
    }catch(err){
        console.error(err);
    }
}

async function fetchCollection(){
    const collectionContainer = document.querySelector('.collection');
    
    try{
        const response = await fetch('/loadCollection');
        const data = await response.json();
    
        data.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card');
            cardDiv.innerHTML = `
            ${renderField(card.card_name, 'text', ['card-info', 'card-name'], 'Card name', 'card_name')}
            ${renderField(card.card_num, 'text', ['card-info', 'card-num'], 'Card number', 'card_num')}
            <p class='card-info condition' data-field="condition">${card.condition ? card.condition : 'Unknown'}</p>
            ${renderField(card.buy_price ? card.buy_price + '€' : null,'text', ['card-info', 'buy-price'], 'Buy price', 'buy_price')}
            ${renderField(card.market_value ? card.market_value + '€' : null,'text', ['card-info', 'market-value'], 'Market value', 'market_value')}
            <button class="delete-btn" data-id="${card.id}">Delete</button>
            `;
            collectionContainer.appendChild(cardDiv);
        });

        const deleteButton = document.querySelectorAll('.delete-btn');
        deleteButton.forEach(button => {
            button.addEventListener('click',() => {
                const cardId = button.getAttribute('data-id');
                const cardDiv = button.closest('.card');
                console.log(cardId);
                removeCard(cardId, cardDiv);  
            });
        });

        collectionContainer.addEventListener('dbclick', (event) => {
            if(event.target.closest('.card') && !(event.target.tagName === "DIV")){
                console.log('click');
            }
        });
        

    } catch(err){
        console.error(err);
    }

}

fetchCollection()