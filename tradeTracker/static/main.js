const auctionContainer = document.querySelector('.auction-container');

function renderField(value, inputType, className, placeholder) {
    if (value === null) {
        return `<input type="${inputType}" class="${className}" placeholder="${placeholder}">`;
    } else {
        return `<p class="${className}">${value}</p>`;
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
                    console.log('Cards loaded:', cards);
                    const auctionDiv = button.closest('.auction-tab');
                    const cardsContainer = auctionDiv.querySelector('.cards-container');

                    cardsContainer.innerHTML = ""; // Clear previous cards
                    cards.forEach(card => {
                        const cardDiv = document.createElement('div');
                        cardDiv.classList.add('card');

                        cardDiv.innerHTML = `
                            ${renderField(card.card_name, 'text', 'card-info', 'Card Name')}
                            <p class='card-info'>${card.condition ? card.condition : 'Unknown'}</p>
                            ${renderField(card.card_price + '€', 'text', 'card-info', 'Card Price')}
                            ${renderField(card.market_value + '€', 'text', 'card-info', 'Market Value')}
                            ${renderField(card.sell_price ? card.sell_price + '€' : null, 'text', 'card-info', 'Sell Price')}
                            <input type="checkbox" class='card-info-checkbox' ${card.sold ? 'checked' : ''}>
                            ${renderField(card.profit ? card.profit + '€' : 'None', 'text', 'card-info', 'Profit')}
                        `;
                        cardsContainer.appendChild(cardDiv);
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