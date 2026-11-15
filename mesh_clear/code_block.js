var sweepReach = 150
var sweepKeep = api.getPlayerIds().concat(api.getMobIds())
var sweepGone = 0
if (typeof hologramClear === "function") {
  try {
    sweepGone += hologramClear()
  } catch (err) {}
}
var sweepLow = [thisPos[0] - sweepReach, thisPos[1] - sweepReach, thisPos[2] - sweepReach]
var sweepHigh = [thisPos[0] + sweepReach, thisPos[1] + sweepReach, thisPos[2] + sweepReach]
var sweepFound = api.getEntitiesInRect(sweepLow, sweepHigh) || []
for (var sweepIdx = 0; sweepIdx < sweepFound.length; sweepIdx++) {
  var sweepIdent = sweepFound[sweepIdx]
  if (sweepKeep.indexOf(sweepIdent) >= 0) continue
  try {
    if (api.deleteMeshEntity(sweepIdent)) sweepGone++
  } catch (err) {}
}
api.sendMessage(myId, "Removed " + sweepGone + " meshes within " + sweepReach + " blocks.", { color: "lime" })
