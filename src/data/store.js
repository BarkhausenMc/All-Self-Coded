// Globale Speicher für Trades und Counter
// ACHTUNG: Diese Daten sind nur im RAM (Arbeitsspeicher)
// Bei einem Bot-Neustart gehen alle Daten verloren!
// Für Produktion: durch SQLite ersetzen.

const tradeCounters = {};  // userId -> Anzahl der Trades
const trades = {};         // threadId -> Trade-Daten Object

module.exports = { tradeCounters, trades };