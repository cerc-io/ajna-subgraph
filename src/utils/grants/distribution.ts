import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import { GrantFund } from "../../../generated/GrantFund/GrantFund"
import { DistributionPeriod } from "../../../generated/schema"

import { FUNDING_PERIOD_LENGTH, ONE_BI, ZERO_BD, ZERO_BI, grantFundNetworkLookUpTable } from "../constants"
import { bigIntToBytes } from "../convert"

export function getDistributionIdAtBlock(blockNumber: BigInt): BigInt {
    const currentDistributionId = getCurrentDistributionId()
    for (let i = currentDistributionId.toI32(); i > 0; i--) {
        const distributionPeriod = DistributionPeriod.load(Bytes.fromI32(i))!

        if (blockNumber > distributionPeriod.startBlock && blockNumber < distributionPeriod.endBlock) {
            return BigInt.fromI32(i)
        }
    }
}

export function getCurrentDistributionId(): BigInt {
    const grantFundAddress  = grantFundNetworkLookUpTable.get(dataSource.network())!
    const grantFundContract = GrantFund.bind(grantFundAddress)
    const distributionIdResult = grantFundContract.getDistributionId()
    return BigInt.fromI32(distributionIdResult)
}

export function getCurrentStage(currentBlockNumber: BigInt, distributionPeriod: DistributionPeriod): String {
    if (currentBlockNumber.lt(distributionPeriod.endBlock - FUNDING_PERIOD_LENGTH)) {
        return "SCREENING"
    } else if (currentBlockNumber.gt(distributionPeriod.endBlock - FUNDING_PERIOD_LENGTH) && currentBlockNumber.lt(distributionPeriod.endBlock)) {
        return "FUNDING"
    } else {
        return "CHALLENGE"
    }
}

export function loadOrCreateDistributionPeriod(distributionId: Bytes): DistributionPeriod {
    let distributionPeriod = DistributionPeriod.load(distributionId)
    if (distributionPeriod == null) {
        // create new distributionPeriod if one hasn't already been stored
        distributionPeriod = new DistributionPeriod(distributionId) as DistributionPeriod
        distributionPeriod.startBlock = ZERO_BI
        distributionPeriod.endBlock = ZERO_BI
        distributionPeriod.topSlate = Bytes.empty()
        distributionPeriod.slatesSubmitted = []
        distributionPeriod.delegationRewardsClaimed = ZERO_BD
        distributionPeriod.fundingVotesCast = ZERO_BD
        distributionPeriod.fundingVotePowerUsed = ZERO_BD
        distributionPeriod.screeningVotesCast = ZERO_BD
        distributionPeriod.proposals = []
        distributionPeriod.totalTokensRequested = ZERO_BD
    }
    return distributionPeriod
}