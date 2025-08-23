

function handleCardInput(input){
    const container = document.querySelector(".cards-container")
    const cards = document.querySelectorAll(".card")
    const currentCard = input.closest('.card');
    const lastCard = cards[cards.length - 1];

    if(currentCard ==lastCard && input.value.trim() !== ''){
        const newCard = lastCard.cloneNode(true);

        newCard.querySelectorAll('input').forEach(el =>{
            if (el.type == 'checkbox') {
                el.checked = false;
            } else{
                el.value = '';
            }
        });

        newCard.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
        });

        const newCardName = newCard.querySelector('.marketValue');
        newCardName.oninput = function () {
        handleCardInput(this);
      };
      container.appendChild(newCard)
    }
}

 class struct{
    constructor(){
        this.cardName = null;
        this.condition = null;
        this.buyPrice = null;
        this.marketValue = null;
        this.sellPrice = null;
        this.checkbox = null;
        this.profit = null;
    }
 }

const cardsArr = [];
const saveButton = document.querySelector('.save-btn')
//add typechecks
saveButton.addEventListener('click', () =>{
    const auctionName = document.querySelector('.auction-name').value;
    const auctionBuy = document.querySelector('.auction-buy-price').value;
    const auctionProfit = document.querySelector('.auction-profit').value;
    const date = new Date().toISOString().slice(0, 10);
    let auction = {
        name: auctionName.trim() || null,
        buy: auctionBuy.trim() || null,
        profit: auctionProfit.trim() || null,
        date: date.trim() || null
    };
    if(cardsArr.length === 0){
        cardsArr.push(auction);
    }
    const cards = document.querySelectorAll('.card');
    cards.forEach(ell =>{
        let card = new struct();
        const input = (selector) =>
            ell.querySelector(selector)?.value.trim() || null;
        //const test = input('input[name=cardName]');
        //console.log(test);
        card.cardName = input('input[name=cardName]');
        card.condition = input('select[name=condition]');
        card.buyPrice = input('input[name=buyPrice]');
        card.marketValue = input('input[name=marketValue]');
        card.sellPrice = input('input[name=sellPrice]');
        card.checkbox = ell.querySelector('input[name=sold]').checked;
        card.profit = input('input[name=profit]');
        if(card.checkbox === true && card.sellPrice !== null && card.buyPrice !==null){
            card.profit = card.sellPrice - card.buyPrice;
        }
        if(card.cardName !== null && card.marketValue !== null){
            cardsArr.push(card);
        }
    });
    console.log(cardsArr);
    console.log(cardsArr.length);
    if (cardsArr.length !== 1){
        const jsonbody = JSON.stringify(cardsArr);
        fetch('/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: jsonbody
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                window.location.href = '/';
            }
        })
            .catch(error => {
                console.error('Error:', error);
            });
    }
})




