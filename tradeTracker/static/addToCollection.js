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
        this.carNum = null;
        this.condition = null;
        this.buyPrice = null;
        this.marketValue = null;
    }
}

const saveButton = document.querySelector('.save-btn');
cardsArr = []

saveButton.addEventListener('click', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach((ell) =>{
        let card = new struct;
        const input = (selector) => ell.querySelector(selector)?.value.trim() || null;
        const inputNumber = (selector) => {
        const val = ell.querySelector(selector)?.value.trim();
        if(!val){
            return null;
        }
            return parseFloat(val.replace(',', '.'));
        };

        card.cardName = input('input[name=cardName]');
        card.carNum = input('input[name=cardNum]');
        card.condition = input('select[name=condition]');
        card.buyPrice = inputNumber('input[name=buyPrice]');
        card.marketValue = inputNumber('input[name=marketValue]');
        if(card.cardName !== null){
            cardsArr.push(card);
        }
    });
    const body = JSON.stringify(cardsArr);

    fetch('/addToCollecton', {
        method : 'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body: body,
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = '/collection';
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});


