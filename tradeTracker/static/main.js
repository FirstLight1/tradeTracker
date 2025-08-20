const auctionContainer = document.querySelector('.auction-container');

function renderField(value, inputType, className, placeholder, datafield) {
    if (value === null) {
        return `<input type="${inputType}" class="${className}" placeholder="${placeholder}" data-field="${datafield}">`;
    } else {
        return `<p class="${className}" data-field="${datafield}">${value}</p>`;
    }
}

async function loadAuctions() {
    try {
        const response = await fetch('/loadAuctions');
        const data = await response.json();
        data.forEach(auction => {
            const auctionDiv = document.createElement('div');
            auctionDiv.classList.add('auction-tab');
            let auctionName = auction.auction_name || "Auction " + auction.id; // Fallback for name
            let auctionPrice = auction.auction_price || ""; // Fallback for buy price  
            let auctionProfit = auction.auction_profit || ""; // Fallback for profit
            auctionDiv.innerHTML = `
                <p>${auctionName}</p>
                <p>${auctionPrice}</p>
                <p>${auctionProfit}</p>
                <button class="view-auction" data-id="${auction.id}">View</button>
                <button class="edit-auction" data-id="${auction.id}">Edit</button>
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
                try {
                    const response = await fetch(cardsUrl);
                    const cards = await response.json();
                    //console.log('Cards loaded:', cards);
                    const auctionDiv = button.closest('.auction-tab');
                    const cardsContainer = auctionDiv.querySelector('.cards-container');

                    cardsContainer.innerHTML = ""; // Clear previous cards
                    cards.forEach(card => {
                        const cardDiv = document.createElement('div');
                        cardDiv.classList.add('card');

                        cardDiv.innerHTML = `
                            ${renderField(card.card_name, 'text', 'card-info', 'Card Name', 'card_name')}
                            <p class='card-info condition' data-field="condition">${card.condition ? card.condition : 'Unknown'}</p>
                            ${renderField(card.card_price + '€', 'text', 'card-info', 'Card Price', 'card_price')}
                            ${renderField(card.market_value + '€', 'text', 'card-info', 'Market Value', 'market_value')}
                            ${renderField(card.sell_price ? card.sell_price + '€' : null, 'text', 'card-info', 'Sell Price', 'sell_price')}
                            <input type="checkbox" class='card-info-checkbox' ${card.sold ? 'checked' : ''}>
                            ${renderField(card.profit ? card.profit + '€' : ' ', 'text', 'card-info', 'Profit', 'profit')}
                            <span hidden class = "card-id">${card.id}</span>
                        `;
                        cardsContainer.appendChild(cardDiv);
                    });
                    cardsContainer.addEventListener('dblclick', (event) => {
                        if (event.target.closest('.card') && !(event.target.tagName === "DIV")) {
                            //console.log('Card double-clicked:', event.target);
                            const cardId = event.target.closest('.card').querySelector('.card-id').textContent;
                            console.log('Card ID:', cardId);
                            if (event.target.classList.contains('condition')) {
                                const value = event.target.textContent;
                                const select = document.createElement('select');
                                const options = [' ', 'Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
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
                                });
                            }
                            if (event.target.tagName === "P") {
                                const value = event.target.textContent;
                                const dataset = event.target.dataset.field;
                                console.log(dataset);
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.value = value;
                                event.target.replaceWith(input);
                                input.focus();
                                input.addEventListener('blur', (event) => {
                                    const newValue = event.target.value;
                                    const p = document.createElement('p');
                                    p.classList.add('card-info');
                                    p.dataset.field = dataset;
                                    if(newValue.includes("€")){
                                        p.textContent = newValue || value;
                                    }else if(newValue.includes("None")){
                                        p.textContent = "None";
                                    } else {
                                        p.textContent = newValue + "€" || value;
                                    }
                                    input.replaceWith(p);
                                    console.log('Updating card:', cardId, p.dataset.field, p.textContent);
                                    const val = p.textContent.replace('€', '').trim();
                                    fetch(`/update/${cardId}`, {
                                        method: 'PATCH',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            field: p.dataset.field,
                                            value: val
                                        })
                                    })
                                    .then(res => res.json())
                                    .then(data => console.log(data))
                                    .catch(err => console.error('Error updating card:', err))
                                });
                                input.addEventListener('keydown', (event) => {
                                    if (event.key === 'Enter') {
                                        input.blur();
                                    }
                                });
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error loading cards:', error);
                }
            });
        });
        const deleteButton = document.querySelectorAll('.delete-auction');
        deleteButton.forEach(button => {
            button.addEventListener('click', () =>{
                const auctionId = button.getAttribute('data-id');
                fetch(`/delete/${auctionId}`, {
                    method: 'DELETE',
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        //console.log('Auction deleted successfully');
                        // Remove the auction from the UI
                        const auctionDiv = button.closest('.auction-tab');
                        auctionDiv.remove();
                    } else {
                        console.error('Error deleting auction:', data);
                    }
                })
                .catch(error => {
                    console.error('Error deleting auction:', error);
                });
            })
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }

}


loadAuctions();