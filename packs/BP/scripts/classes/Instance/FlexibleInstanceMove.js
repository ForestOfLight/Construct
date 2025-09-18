export class FlexibleInstanceMove {
    player;
    instance;

    constructor(instance, player) {
        this.instance = instance;
        this.player = player;
        this.tryBeginFlexibleMove();        
    }

    tryBeginFlexibleMove() {
        if (this.instance.isFlexMoving) {
            this.feedback('§cThis instance is already being moved.');
            return;
        }
        this.beginFlexibleMove();
    }

    beginFlexibleMove() {
        // place structure in movement mode
        this.instance.startFlexibleMove(this.player);
        // lock player controls
        // start handling player movement controls
    }

    endFlexibleMove() {
        this.instance.stopFlexibleMove();
    }

    feedback(str) {
        this.player.sendMessage(str);
    }
}

// if the player logs out, stop the move