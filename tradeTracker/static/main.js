export function renderField(value, inputType, classList, placeholder, datafield) {
    if (value === null) {
        return `<input type="${inputType}" class="${classList.join(' ')}" placeholder="${placeholder}" data-field="${datafield}">`;
    } else {
        return `<p class=" ${classList.join(' ')}" data-field="${datafield}">${value}</p>`;
    }
}

function allTrue(checkboxes){
    for(let i = 0; i < checkboxes.length; i++){
        if(!checkboxes[i].checked){
            return false;
        }
    }
    return true;
}

function appendEuroSign(value, dataset){
    if (dataset === 'card_num'){
        return value;
    }
    if (isNaN(value)){
        return value;
    } else{
        return value + '€';
    }
}

export function replaceWithPElement(dataset, value, element){
    const p = document.createElement('p');
    p.dataset.field = dataset;
    p.classList.add('card-info', dataset.replace('_', '-'));
    p.textContent = appendEuroSign(value, dataset);
    element.replaceWith(p);
}

function getInputValueAndPatch(value, element, dataset, cardId){
    if (!Boolean(value)){
        return null;
    }
    replaceWithPElement(dataset, value, element);
    patchValue(cardId, value, dataset);
}

function updateSoldStatus(cardId, isChecked, field) {
    //console.log(cardId, isChecked, field);
    fetch(`/update/${cardId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field: field, value: isChecked })
    });
}

function patchValue(id, value, dataset){
    value = String(value);
    value = value.replace('€', '');
    fetch(`/update/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field: dataset, value: value })
    });
}

function deleteAuction(id, div){
    fetch(`/deleteAuction/${id}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            //console.log('Auction deleted successfully');
            // Remove the auction from the UI
            div.remove();
        } else {
            console.error('Error deleting auction:', data);
        }
    })
    .catch(error => {
        console.error('Error deleting auction:', error);
    });
}

async function removeCard(id, div) {
    try {
        const response = await fetch(`/deleteCard/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();

        if (data.status === 'success') {
            div.remove(); // remove the card from DOM
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

async function updateAuction(auctionId, value){
    try {
        const response = await fetch(`/updateAuction/${auctionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: value })
        });
        const data = await response.json();
        if (data.status === 'success') {
            console.log('Auction updated successfully');
        } else {
            console.error('Error updating auction:', data);
        }
    } catch (error) {
        console.error('Error updating auction:', error);
    }
}

function updateAuctionProfit(auction, id){
    const cards = auction.querySelectorAll('.card');
    const profitField = auction.querySelector('.auction-profit');
    let profit = 0;
    cards.forEach(card =>{
        const cardProfit = card.querySelector('.profit').textContent.replace('€', '');
        profit += Number(cardProfit);
    })
    fetch(`/updateAuctionProfit/${id}`,{
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({value: profit})
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === 'success'){
            profitField.textContent = profit + '€';
        }
    })
    .catch(error =>{
        console.error(error);
    })
}


function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

async function loadAuctions() {
    const auctionContainer = document.querySelector('.auction-container');
    try {
        const response = await fetch('/loadAuctions');
        const data = await response.json();
        data.forEach(auction => {
            const auctionDiv = document.createElement('div');
            auctionDiv.classList.add('auction-tab');
            if(auction.auction_name === 'Singles'){
                auctionDiv.classList.add('singles');
            }
            auctionDiv.setAttribute('data-id', auction.id);
            let auctionName = auction.auction_name || "Auction " + (auction.id - 1); // Fallback for name
            let auctionPrice = auction.auction_price || null; // Fallback for buy price  
            let auctionProfit = auction.auction_profit || null; // Fallback for profit
            auctionDiv.innerHTML = `
                <p class="auction-name">${auctionName}</p>
                <p class="auction-price">${auctionPrice != null ? auctionPrice + '€' : ""}</p>
                <p class="auction-profit">${auctionProfit != null ? auctionProfit + '€' : ""}</p>
                <button class="view-auction" data-id="${auction.id}">View</button>
                <button class="delete-auction" data-id="${auction.id}">Delete</button>
                <div class="cards-container">
                    <!-- Cards will be loaded here -->
                </div>
            `;
            auctionContainer.appendChild(auctionDiv);
        });

        // Attach event listeners after auctions are loaded
        const viewButtons = document.querySelectorAll('.view-auction');
        viewButtons.forEach(button => {
            button.addEventListener('click', async () => {
                //console.log('View auction button clicked for ID:', button.getAttribute('data-id'));
                const auctionId = button.getAttribute('data-id');
                const cardsUrl = '/loadCards/' + auctionId;
                const auctionDiv = button.closest('.auction-tab');
                const cardsContainer = auctionDiv.querySelector('.cards-container');
                //console.log(cardsContainer.childElementCount);
                try {
                    if (cardsContainer.childElementCount === 0 || cardsContainer.style.display === 'none'){
                        const response = await fetch(cardsUrl);
                        const cards = await response.json();
                        cardsContainer.style.display = 'block';
                        button.textContent = 'Hide';
                        if(isEmpty(cards)){
                            cardsContainer.innerHTML = '<div><p>Empty</p></div>';
                        }else{

                        cardsContainer.innerHTML = ""; // Clear previous cards
                        cards.forEach(card => {
                            const cardDiv = document.createElement('div');
                            cardDiv.classList.add('card');

                            cardDiv.innerHTML = `
                                ${renderField(card.card_name, 'text', ['card-info', 'card-name'], 'Card Name', 'card_name')}
                                <p class='card-info condition' data-field="condition">${card.condition ? card.condition : 'Unknown'}</p>
                                ${renderField(card.card_price ? card.card_price + '€' : null, 'text', ['card-info', 'card-price'], 'Card Price', 'card_price')}
                                ${renderField(card.market_value ? card.market_value + '€' : null, 'text', ['card-info', 'market-value'], 'Market Value', 'market_value')}
                                ${renderField(card.sell_price ? card.sell_price + '€' : null, 'text', ['card-info', 'sell-price'], 'Sell Price', 'sell_price')}
                                <input type="checkbox" class='card-info-checkbox sold' ${card.sold ? 'checked' : ''}>
                                <input type="checkbox" class='card-info-checkbox sold-cm' ${card.sold_cm ? 'checked' : ''}>
                                ${renderField(card.profit != null ? card.profit + '€' : ' ', 'text', ['card-info', 'profit'], 'Profit', 'profit')}
                                <span hidden class = "card-id">${card.id}</span>
                                <button class=delete-card data-id="${card.id}">Delete</button>
                            `;
                            cardsContainer.appendChild(cardDiv);
                        });

                        cardsContainer.addEventListener('dblclick', (event) => {
                            if (event.target.closest('.card') && !(event.target.tagName === "DIV") && !(event.target.classList.contains('profit'))) {
                                const cardDiv = event.target.closest('.card');
                                const cardId = cardDiv.querySelector('.card-id').textContent;
                                if (event.target.classList.contains('condition')) {
                                    const value = event.target.textContent;
                                    const select = document.createElement('select');
                                    const options = ['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
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
                                    select.addEventListener('change', (event) => {
                                        const selectedValue = event.target.value;
                                        const p = document.createElement('p');
                                        p.classList.add('card-info', 'condition');
                                        p.textContent = selectedValue || value;
                                        select.replaceWith(p);
                                        //console.log('Updating card:', cardId, dataset, p.textContent);
                                        patchValue(cardId, p.textContent, dataset);
                                    });
                                }
                                if (event.target.tagName === "P") {
                                    const value = event.target.textContent;
                                    const dataset = event.target.dataset.field;
                                    //console.log(dataset);
                                    const input = document.createElement('input');
                                    input.type = 'text';
                                    input.value = value;
                                    input.classList.add(...event.target.classList);
                                    event.target.replaceWith(input);
                                    input.focus();
                                    input.addEventListener('blur', (blurEvent) => {
                                        const newValue = blurEvent.target.value;

                                        getInputValueAndPatch(newValue || value, input, dataset, cardId);
                                        if (blurEvent.target.classList.contains('card-price') || blurEvent.target.classList.contains('sell-price')) {
                                            // Recalculate profit
                                            if (cardDiv) {
                                                const buyInput = cardDiv.querySelector('.card-price');
                                                const sellInput = cardDiv.querySelector('.sell-price');
                                                const profitElement = cardDiv.querySelector('.profit');

                                                // Determine updated buy/sell values
                                                let buyValue = buyInput ? buyInput.textContent.replace('€', '').trim() : '';
                                                let sellValue = sellInput ? sellInput.textContent.replace('€', '').trim() : '';

                                                if (blurEvent.target.classList.contains('card-price')) {
                                                    buyValue = blurEvent.target.value.replace('€', '').trim();
                                                }
                                                if (blurEvent.target.classList.contains('sell-price')) {
                                                    sellValue = blurEvent.target.value.replace('€', '').trim();
                                                }
                                                const profit = Number(sellValue) - Number(buyValue);
                                                if (profitElement) {
                                                    const profitDataSet = profitElement.dataset.field;
                                                    replaceWithPElement(profitDataSet, profit, profitElement);
                                                    patchValue(cardId, profit, profitDataSet);
                                                    const auction = cardDiv.closest('.auction-tab');
                                                    const auctionId = auction.getAttribute('data-id')
                                                    updateAuctionProfit(auction, auctionId);
                                                }
                                            }
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

                        const checkboxes = cardsContainer.querySelectorAll('.card-info-checkbox');
                        const auctionTab = checkboxes[0].closest('.auction-tab')
                        const auctionPrice = Number(auctionTab.querySelector('.auction-price').textContent.replace('€', ''));
                        let auctionProfit = auctionTab.querySelector('.auction-profit').textContent.replace('€', '') || 0;
                        console.log(Boolean(auctionPrice));
                        //this needs changing

                        checkboxes.forEach((checkbox) => {
                            checkbox.addEventListener('click', (event) => {
                                const isChecked = event.target.checked;
                                let profitElement = event.target.closest('.card').querySelector('.profit');
                                const target = event.target;
                                
                                if (!Boolean(profitElement.textContent) || !isChecked){
                                    event.preventDefault();
                                }else{

                                    //check if auction or singles

                                    const cardBuyElement = target.closest('.card').querySelector('.card-price').textContent.replace('€', '');
                                    const cardSellElement = target.closest('.card').querySelector('.sell-price').textContent.replace('€', '');
                                    const cardId = target.closest('.card').querySelector('.card-id').textContent;
                                    const auctionElement = target.closest('.auction-tab');
                                    const auctionId = auctionElement.getAttribute('data-id');
                                    const auctionPrice = Number(auctionElement.querySelector('.auction-price').textContent.replace('€', ''));
                                    if ((!Boolean(cardBuyElement) || !Boolean(auctionPrice)) || !Boolean(cardSellElement)){
                                        event.preventDefault();
                                    } else{
                                        let profit = 0;

                                        //this probably doesnt even work
                                        //I need to know if its singles or auction
                                        //ahhhhhhhhhhhhhhhhhhhhhhhh

                                        if(target.classList.contains('sold-cm') && Boolean(auctionPrice)){
                                            const soldCheckbox = target.closest('.card').querySelector('.sold');
                                            profit = auctionPrice - (cardSellElement * 0.95);
                                            console.log(profit);
                                            let auctionProfitNum = Number(auctionProfit);
                                            auctionProfitNum += profit;
                                            auctionProfit = appendEuroSign(auctionProfitNum);
                                            checkbox.checked = true; // Keep checkbox checked
                                            soldCheckbox.checked = false;
                                            updateSoldStatus(cardId, isChecked, "sold_cm");
                                            // this update auction profit, but the technical dept was too big, so I made new function might change later
                                            updateAuction(auctionId, auctionProfit.replace('€', ''));
                                        } else{
                                            const soldCheckbox = target.closest('.card').querySelector('.sold-cm');
                                            profit = cardSellElement - cardBuyElement;
                                            profit = appendEuroSign(profit);
                                            profitElement.textContent = profit;
                                            checkbox.checked = true; // Keep checkbox checked
                                            soldCheckbox.checked = false;
                                            updateSoldStatus(cardId, isChecked, "sold");
                                            patchValue(cardId, profit, profitElement.dataset.field);
                                            updateAuctionProfit(auctionElement, auctionId);
                                        }
                                    }
                                }
                            }, false);
                        });

                        const inputFields = cardsContainer.querySelectorAll('input[type="text"]');
                        inputFields.forEach((input) => {
                            input.addEventListener('blur', (event) =>{
                                const cardId = event.target.closest('.card').querySelector('.card-id').textContent;
                                const value = event.target.value;
                                const dataset = event.target.dataset;
                                getInputValueAndPatch(value, input, dataset.field, cardId);
                            })
                            input.addEventListener('keydown', (event) => {
                                if(event.key === 'Enter'){
                                    input.blur();
                                }
                            });
                        });

                        const deleteCard = document.querySelectorAll('.delete-card');
                        deleteCard.forEach((button) => {
                            button.addEventListener('click', async () => {
                                const cardId = button.getAttribute('data-id');
                                const cardDiv = button.closest('.card');
                                const cardsContainer = button.closest('.cards-container');
                                const auctionId = cardsContainer.closest('.auction-tab').getAttribute('data-id');
                                const auctionDiv = cardsContainer.closest('.auction-tab');
                                const deleted = await removeCard(cardId, cardDiv);
                                if(!deleted) return;
                                //recalculate profit
                                updateAuctionProfit(auctionDiv, auctionId)
                                if (cardsContainer.childElementCount === 0){
                                    if(!(auctionDiv.classList.contains('singles'))){
                                        deleteAuction(auctionId, auctionDiv);
                                    }
                                }
                            });
                        });
                    }
                    } else{
                        cardsContainer.style.display = 'none';
                        button.textContent = 'View';
                    }
                } catch (error) {
                    console.error('Error loading cards:', error);
                }
            });
        });
        const deleteButton = document.querySelectorAll('.delete-auction');
        deleteButton.forEach(button => {
            button.addEventListener('click', () =>{
                const auctionId = button.getAttribute('data-id');
                if(auctionId != 1){
                    const auctionDiv = button.closest('.auction-tab');  
                    deleteAuction(auctionId, auctionDiv);
                }
            });
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }

}


loadAuctions();