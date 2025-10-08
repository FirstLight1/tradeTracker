export function renderField(value, inputType, classList, placeholder, datafield) {
    if (value === null) {
        return `<input type="${inputType}" class="${classList.join(' ')}" placeholder="${placeholder}" data-field="${datafield}" autocomplete="off">`;
    } else {
        return `<p class=" ${classList.join(' ')}" data-field="${datafield}">${value}</p>`;
    }
}

export function allTrue(checkboxes){
    const grouped = groupCheckboxes(checkboxes);    
    for (let i = 0; i < grouped.length; i++){
        if(!grouped[i][0].checked && !grouped[i][1].checked){
            return false;
        }
    }
    return true;
}

function groupCheckboxes(checkboxes) {
    const grouped = [];
    for (let i = 0; i < checkboxes.length; i += 2) {
        grouped.push([checkboxes[i], checkboxes[i + 1]]);
    }
    return grouped;
}

function appendEuroSign(value, dataset){
    if (dataset === 'card_num' || dataset === 'card_name'){
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


async function updateSoldStatus(cardId, isChecked, field) {
    try{
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
        } else{
            return
        }
    } catch (e){
        console.error('Error updating sold status:', e);
        return;
    }
}

//These two are the same

async function patchValue(id, value, dataset){
    if(value === " "){
        value = null;
    }
    if(!value === null || !value === undefined){
        value = String(value);
        value = value.replace('€', '');

    }
    try{
        const response = await fetch(`/update/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ field: dataset, value: value })
        });
        const data = await response.json();
        if(!(data.status === 'success')){
            console.error('failed to update:', dataset)
            return;
        }else{
            return
        }
    }catch(e){
        console.error('Error updating value:', e);
    }
}

function deleteAuction(id, div){
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

function checkboxSwitching(target, buyPrice, sellPrice, profitElement, id){
    if (target.classList.contains('sold')) {
        profitElement.textContent = appendEuroSign((sellPrice - buyPrice).toFixed(2), 'profit');
        target.closest('.card').querySelector('.sold-cm').checked = false;
        updateSoldStatus(id, true, 'sold');
    } else if (target.classList.contains('sold-cm')) {
        const value = ((sellPrice * 0.95) - buyPrice).toFixed(2);
        profitElement.textContent = appendEuroSign(value, 'profit');
        target.closest('.card').querySelector('.sold').checked = false;
        updateSoldStatus(id, true, 'sold_cm');
    }
    return Number(profitElement.textContent.replace('€', '').trim()).toFixed(2);
}

function calculateSinglesProfit(card, target) {
    const buyPrice = Number(card.querySelector('.card-price').textContent.replace('€', '').trim());
    const sellPrice = Number(card.querySelector('.sell-price').textContent.replace('€', '').trim());
    const profitElement = card.querySelector('.profit');
    const cardId = card.querySelector('.card-id').textContent.trim();
    const profit = checkboxSwitching(target, buyPrice, sellPrice, profitElement, cardId);
    
    patchValue(cardId, profit, 'profit');
}

//calculates singles profit after checkbox change
function SinglesProfit(cards){
    let totalProfit = 0;
    cards.forEach(card => {
        const profit = Number(card.querySelector('.profit').textContent.replace('€', '').trim());
        totalProfit += profit;
    });
    totalProfit = totalProfit.toFixed(2)
    return totalProfit;
}

function changeCheckboxState(checkbox){
    if(checkbox.classList.contains('sold')){
        checkbox.closest('.card').querySelector('.sold-cm').checked = false;
        return true;
    }else if(checkbox.classList.contains('sold-cm')){
        checkbox.closest('.card').querySelector('.sold').checked = false;
        return false
    }
}

async function calculateAuctionProfit(auction, target){
    const auctionPrice = Number(auction.querySelector('.auction-price').textContent.replace('€', '').trim());
    const auctionProfitElement = auction.querySelector('.auction-profit');
    const auctionId = auction.getAttribute('data-id');
    const cards = auction.querySelectorAll('.card');
    let totalSellValue = 0;

    if (target != null) {
        if(changeCheckboxState(target)){
            await updateSoldStatus(target.closest('.card').querySelector('.card-id').textContent.trim(), true, 'sold');
        }else{
            await updateSoldStatus(target.closest('.card').querySelector('.card-id').textContent.trim(), true, 'sold_cm');
        }
    }

    cards.forEach(card =>{
        const sellPrice = Number(card.querySelector('.sell-price').textContent.replace('€', '').trim());
        const soldCheckbox = card.querySelector('.sold');
        const soldCmCheckbox = card.querySelector('.sold-cm');
        if(soldCheckbox.checked){
            totalSellValue += sellPrice;
        }else if(soldCmCheckbox.checked){
            totalSellValue += sellPrice * 0.95;
        }
    });
    const profit = (totalSellValue - auctionPrice).toFixed(2);
    auctionProfitElement.textContent = appendEuroSign(profit, 'auction-profit');
    updateAuction(auctionId, profit, 'auction_profit');
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

async function updateAuction(auctionId, value, field){
    try {
        const response = await fetch(`/updateAuction/${auctionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({field: field, value: value })
        });
        const data = await response.json();
        if (!(data.status === 'success')) {
            console.error('Error updating auction:', data);
            return;
        } else{
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

function importCSV(){
    const input = document.querySelector('.import-sold-csv');
    input.style.opacity = 0;
    input.addEventListener('change', async (event) =>{
        const file = event.target.files;
        if(file && file.length === 1){
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

async function getInventoryValue(){
    try{
        const response = await fetch('/inventoryValue');
        const data = await response.json();
        return data.value;
    } catch(e){
        console.error(e);
    }
}

async function getTotalProfit(){
    try{
        const response = await fetch('/totalProfit');
        const data = await response.json();
        return data.value
    } catch(e){
        console.error(e);
    }
}

export async function updateInventoryValueAndTotalProfit() {
        const value = await getInventoryValue();
        if(value != null){
            const inventoryValueElement = document.querySelector('.inventory-value-value');
            inventoryValueElement.textContent = "  " + appendEuroSign(value.toFixed(2));
        }
    
        const profit = await getTotalProfit();
        if(profit != null){
            const totalProfitElement = document.querySelector('.total-profit-value');
            totalProfitElement.textContent = " " + appendEuroSign(profit.toFixed(2));
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
            if(auction.auction_name === 'Singles'){
                auctionDiv.classList.add('singles');
            }
            auctionDiv.setAttribute('data-id', auction.id);
            let auctionName = auction.auction_name || "Auction " + (auction.id - 1); // Fallback for name
            let auctionPrice = auction.auction_price || null; // Fallback for buy price
            let auctionProfit = auction.auction_profit !== null ? auction.auction_profit : null; // Fallback for profit
            auctionDiv.innerHTML = `
                <p class="auction-name">${auctionName}</p>
                ${renderField(auctionPrice != null ? auctionPrice + '€' : null, 'text', ['auction-price'], 'Auction Buy Price', 'auction_price')}
                <p class="auction-profit">${auctionProfit != null ? auctionProfit + '€' : ""}</p>
                <button class="view-auction" data-id="${auction.id}">View</button>
                <button class="delete-auction" data-id="${auction.id}">Delete</button>
                <div class="cards-wrapper">
                    <div class="cards-container">
                        <!-- Cards will be loaded here -->
                        
                    </div>
                    <div class="button-container">
                        <button class="add-cards-auction">Add cards</button>
                        <button class="save-added-cards hidden="">Save</button>
                    </div>
                </div>
            `;
            auctionContainer.appendChild(auctionDiv);
        });

        const auctionPriceInputs = document.querySelectorAll('input.auction-price');
        auctionPriceInputs.forEach(input => {
            input.addEventListener('blur', (event) =>{
                const value = event.target.value.replace(',', '.');
                const auctionDiv = event.target.closest('.auction-tab');
                const auctionId = auctionDiv.getAttribute('data-id');
                if (!Boolean(value)){
                    return;
                }
                updateAuction(auctionId, value, 'auction_price');
                const p = document.createElement('p');
                p.classList.add('auction-price');
                p.textContent = appendEuroSign(value, 'auction_price');
                event.target.replaceWith(p);
            })
            input.addEventListener('keydown', (event) =>{
                if(event.key == 'Enter'){
                    input.blur();
                }
            })
        })

        const auctionPrices = document.querySelectorAll('p.auction-price');
        auctionPrices.forEach(price => {
            price.addEventListener('dblclick', (event) =>{
                const value = event.target.textContent;
                const dataset = event.target.dataset.field;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.classList.add(...event.target.classList);
                event.target.replaceWith(input);
                input.focus();
                input.addEventListener('blur', (blurEvent) =>{
                    let value = blurEvent.target.value.replace(',', '.');
                    if (isNaN(value)){
                        value = value.toUpperCase();
                    }
                    const auctionDiv = blurEvent.target.closest('.auction-tab');
                    const auctionId = auctionDiv.getAttribute('data-id');
                    if (!Boolean(value)){
                        return;
                    }
                    updateAuction(auctionId, value, 'auction_price');
                    const p = document.createElement('p');
                    p.classList.add('auction-price');
                    p.textContent = appendEuroSign(value, 'auction_price');
                    blurEvent.target.replaceWith(p);
                })
                input.addEventListener('keydown', (keyEvent)=>{
                    if(keyEvent.key == 'Enter'){
                        input.blur();
                    }
                })
            }) 
        })
        // Attach event listeners after auctions are loaded
        const viewButtons = document.querySelectorAll('.view-auction');
        viewButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const auctionId = button.getAttribute('data-id');
                const cardsUrl = '/loadCards/' + auctionId;
                const auctionDiv = button.closest('.auction-tab');
                const cardsContainer = auctionDiv.querySelector('.cards-container');
                try {
                    if (cardsContainer.childElementCount === 0 || cardsContainer.style.display === 'none'){
                        const response = await fetch(cardsUrl);
                        const cards = await response.json();
                        cardsContainer.style.display = 'block';
                        button.textContent = 'Hide';
                        if(isEmpty(cards)){
                            cardsContainer.innerHTML = '<div><p>Empty</p></div>';
                        }else{

                        cardsContainer.innerHTML = `
                            <div class="cards-header">
                                <p>Card name</p>
                                <p>Card number</p>
                                <p>Condition</p>
                                <p>Buy price</p>
                                <p>Market value</p>
                                <p>Sell price</p>
                                <p>Sold</p>
                                <p>Sold CM</p>
                                <p>Profit</p>
                            </div>
                        `; // Clear previous cards
                        cards.forEach(card => {
                            const cardDiv = document.createElement('div');
                            cardDiv.classList.add('card');

                            cardDiv.innerHTML = `
                                ${renderField(card.card_name, 'text', ['card-info', 'card-name'], 'Card Name', 'card_name')}
                                ${renderField(card.card_num, 'text', ['card-info', 'card-num'], 'Card Number', 'card_num')}
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
                                        p.classList.add('card-info', 'condition');
                                        p.textContent = selectedValue || value;
                                        select.replaceWith(p);
                                        patchValue(cardId, p.textContent, dataset);
                                    });
                                }
                                if (event.target.tagName === "P") {
                                    let value = event.target.textContent.replace('€','');
                                    if(isNaN(value)){
                                        value = value.toUpperCase();
                                    }
                                    const dataset = event.target.dataset.field;
                                    const input = document.createElement('input');
                                    input.type = 'text';
                                    input.value = value;
                                    input.classList.add(...event.target.classList);
                                    event.target.replaceWith(input);
                                    input.focus();
                                    input.addEventListener('blur', async(blurEvent) => {
                                        let newValue = blurEvent.target.value.replace(',', '.');
                                        if(isNaN(newValue)){
                                            newValue = newValue.toUpperCase();
                                        }
                                        const auctionTab = blurEvent.target.closest('.auction-tab');

                                        getInputValueAndPatch(newValue || value, input, dataset, cardId);
                                        if (blurEvent.target.classList.contains('card-price') || blurEvent.target.classList.contains('sell-price')) {
                                            if (auctionTab.classList.contains('singles')){
                                            // Recalculate profit
                                                if (cardDiv) {
                                                    const buyInput = cardDiv.querySelector('.card-price');
                                                    const sellInput = cardDiv.querySelector('.sell-price');
                                                    const profitElement = cardDiv.querySelector('.profit');
                                                    const checkbox = cardDiv.querySelector('.sold');
                                                    const checkboxCm = cardDiv.querySelector('.sold-cm');
                                                    let profit;

                                                    // Determine updated buy/sell values
                                                    let buyValue = buyInput ? buyInput.textContent.replace('€', '').trim() : '';
                                                    let sellValue = sellInput ? sellInput.textContent.replace('€', '').trim() : '';

                                                    if (blurEvent.target.classList.contains('card-price')) {
                                                        buyValue = blurEvent.target.value.replace('€', '').trim();
                                                    }
                                                    if (blurEvent.target.classList.contains('sell-price')) {
                                                        sellValue = blurEvent.target.value.replace('€', '').trim();
                                                    }

                                                    if (checkbox.checked){
                                                        profit = Number(sellValue) - Number(buyValue);
                                                        checkboxCm.checked = false;
                                                        updateSoldStatus(cardId, true,"sold");
                                                    } else if(checkboxCm.checked){
                                                        profit = ((Number(sellValue) * 0.95) - Number(buyValue)).toFixed(2);
                                                        updateSoldStatus(cardId, true,"sold_cm");
                                                    }

                                                    if (profitElement) {
                                                        const profitDataSet = profitElement.dataset.field;
                                                        replaceWithPElement(profitDataSet, profit, profitElement);
                                                        patchValue(cardId, profit, profitDataSet);
                                                        const auction = cardDiv.closest('.auction-tab');
                                                        const auctionId = auction.getAttribute('data-id')
                                                        const newAuctionProfit = SinglesProfit(auction.querySelectorAll('.card'));
                                                        updateAuction(auctionId, newAuctionProfit, 'auction_profit');
                                                        auction.querySelector('.auction-profit').textContent = appendEuroSign(newAuctionProfit, 'auction-profit');
                                                        await updateInventoryValueAndTotalProfit()
                                                    }
                                                }
                                            }else{
                                                const checkboxes = cardsContainer.querySelectorAll('.card-info-checkbox')
                                                const auctionTab = checkboxes[0].closest('.auction-tab')
                                                calculateAuctionProfit(auctionTab,null);
                                                await updateInventoryValueAndTotalProfit();
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

                        checkboxes.forEach((checkbox) => {
                            checkbox.addEventListener('click', async (event) => {
                                const target = event.target;
                                const card = target.closest('.card');
                                const cardId = card.querySelector('.card-id').textContent;
                                const cards = auctionTab.querySelectorAll('.card');
                                if(auctionTab.classList.contains('singles')){
                                    calculateSinglesProfit(card, target);
                                    const newAuctionProfit = SinglesProfit(cards);
                                    auctionTab.querySelector('.auction-profit').textContent = appendEuroSign(newAuctionProfit, 'auction-profit');
                                    const auctionId = auctionTab.getAttribute('data-id');
                                    await updateAuction(auctionId, newAuctionProfit, 'auction_profit');
                                    await updateInventoryValueAndTotalProfit();
                                    await patchValue(cardId, new Date().toISOString(), "sold_date")
                                } else{
                                    await calculateAuctionProfit(auctionTab, target);
                                    await updateInventoryValueAndTotalProfit();
                                    if(changeCheckboxState(target)){
                                        await updateSoldStatus(target.closest('.card').querySelector('.card-id').textContent.trim(), true, 'sold');
                                    }else{
                                        await updateSoldStatus(target.closest('.card').querySelector('.card-id').textContent.trim(), true, 'sold_cm');
                                    }
                                    await patchValue(cardId, new Date().toISOString(), "sold_date");
                                }
                            }, false);
                        });

                        const inputFields = cardsContainer.querySelectorAll('input[type="text"]');
                        inputFields.forEach((input) =>{
                            input.addEventListener('blur', async (event) =>{
                                const cardId = event.target.closest('.card').querySelector('.card-id').textContent;
                                const value = event.target.value.replace(',', '.');
                                const dataset = event.target.dataset;
                                getInputValueAndPatch(value, input, dataset.field, cardId);
                                await updateInventoryValueAndTotalProfit();
                            })
                            input.addEventListener('keydown', (event) => {
                                if(event.key === 'Enter'){
                                    input.blur();
                                }
                            });
                        });

                        const deleteCard = document.querySelectorAll('.delete-card');
                        deleteCard.forEach(async(button) => {
                            button.addEventListener('click', async () => {
                                const cardId = button.getAttribute('data-id');
                                const cardDiv = button.closest('.card');
                                const cardsContainer = button.closest('.cards-container');
                                const auctionId = cardsContainer.closest('.auction-tab').getAttribute('data-id');
                                const auctionDiv = cardsContainer.closest('.auction-tab');
                                const deleted = await removeCard(cardId, cardDiv);
                                const cards = cardsContainer.querySelectorAll('.card');
                                if(!deleted) return;
                                if(auctionDiv.classList.contains('singles')){
                                    const newAuctionProfit = SinglesProfit(cards);
                                    auctionDiv.querySelector('.auction-profit').textContent = appendEuroSign(newAuctionProfit, 'auction-profit');
                                    await updateAuction(auctionId, newAuctionProfit, 'auction_profit');
                                    await updateInventoryValueAndTotalProfit()
                                    if (cardsContainer.childElementCount === 1){
                                        const p = document.createElement('p');
                                        p.textContent = 'Empty';
                                        cardsContainer.appendChild(p);
                                    }
                                }else{
                                    calculateAuctionProfit(auctionDiv, null);
                                    await updateInventoryValueAndTotalProfit()
                                }
                                if (cardsContainer.childElementCount === 1){
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
                    updateInventoryValueAndTotalProfit()
                }
            });
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }

}

if(document.title === "Trade Tracker"){
    loadAuctions();
    importCSV();
    document.addEventListener('DOMContentLoaded', async () => {
        await updateInventoryValueAndTotalProfit();
    }, false);
}
