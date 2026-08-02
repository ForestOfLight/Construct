import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";

// Levels with no colour get no box at all. That is what makes a cell going
// to Match or Air a removal rather than a recolour.
export function getVerificationLevelColor(verificationLevel) {
    switch (verificationLevel) {
        case BlockVerificationLevel.NoMatch:
            return { red: 1, green: 0, blue: 0, alpha: 1 };
        case BlockVerificationLevel.TypeMatch:
            return { red: 1, green: 1, blue: 0, alpha: 1 };
        case BlockVerificationLevel.Missing:
            return { red: 0.3, green: 0.57, blue: 0.87, alpha: 1 };
        default:
            return void 0;
    }
}

export function getVerificationLevelScale(verificationLevel) {
    switch (verificationLevel) {
        case BlockVerificationLevel.NoMatch:
        case BlockVerificationLevel.TypeMatch:
            return 1.01;
        default:
            return 1.00;
    }
}
