const auctionContainer = document.querySelector('.auction-container');

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
                console.log('View auction button clicked for ID:', button.getAttribute('data-id'));
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
                            <p>${card.card_name}</p>
                            <p>${card.card_price}</p>
                            <button class="view-card" data-id="${card.id}">View</button>
                        `;
                        cardsContainer.appendChild(cardDiv);
                    });
                } catch (error) {
                    console.error('Error loading cards:', error);
                }
            });
        });
    } catch (error) {
        console.error('Error loading auctions:', error);
    }
}

loadAuctions();