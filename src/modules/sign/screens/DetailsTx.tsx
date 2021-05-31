// Copyright 2015-2021 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

// This screen shows payload details and asks for signing confirmation

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, View, FlatList } from 'react-native';

import { PayloadCardData } from 'types/payloads';
import strings from 'modules/sign/strings';
import { SafeAreaViewContainer } from 'components/SafeAreaContainer';
import testIDs from 'e2e/testIDs';
import { AccountsContext } from 'stores/AccountsContext';
import { NetworksContext } from 'stores/NetworkContext';
import { ScannerContext } from 'stores/ScannerContext';
import { FoundAccount } from 'types/identityTypes';
import { isEthereumNetworkParams } from 'types/networkTypes';
import { NavigationProps, NavigationScannerProps } from 'types/props';
import CompatibleCard from 'components/CompatibleCard';
import { Transaction } from 'utils/transaction';
import styles from 'modules/sign/styles';
import Separator from 'components/Separator';
import Button from 'components/Button';
import { makeTransactionCardsContents } from 'utils/native';
import PayloadCard from 'modules/sign/components/PayloadCard';
import { dumpMetadataDB } from 'utils/db';
import { typeDefs } from 'constants/typeDefs';

interface ActionType {
	buttonLabel: string;
	payload: any;
	type: string;
}

function DetailsTx({
	route,
	navigation
}: NavigationProps<'DetailsTx'>): React.ReactElement {
	const accountsStore = useContext(AccountsContext);
	const { dumpNetworksData, getNetwork, networkContext } = useContext(NetworksContext);
	const payload = route.params.payload;
	const [payloadCards, setPayloadCards] = useState<PayloadCardData[]>([
		{ indent: 0, index: 0, payload: {}, type: 'loading' }
	]);
	const [action, setAction] = useState<ActionType>({
		buttonLabel: 'Back',
		payload: '',
		type: ''
	})
	const [sender, setSender] = useState<null | FoundAccount>(null);

	useEffect(() => {
		const generateCards = async function (encoded: string): Promise<void> {
			const networksData = dumpNetworksData();
			const metadata = await dumpMetadataDB();
			const metadataJSON = JSON.stringify(metadata);
			const cardsSet = await makeTransactionCardsContents(
				encoded,
				networksData,
				metadataJSON,
				typeDefs
			);
			//TODO: here should be finer features on what to do
			//with different payload types.
			//
			//last sort seems useless but things depend
			//on undocumented features otherwise
			const sortedCardSet = [].concat(
				cardsSet.author ? cardsSet.author : [],
				cardsSet.error ? cardsSet.error : [],
				cardsSet.method ? cardsSet.method : [],
				cardsSet.extrinsics ? cardsSet.extrinsics : []
			).sort((a,b) => {return a.index-b.index;});
			console.log(sortedCardSet);
			setPayloadCards(sortedCardSet ? sortedCardSet : 
				{ indent: 0, index: 0, payload: "System error: transaction parser failed entirely", type: 'error' }
			);
			//TODO: this should be just an object from Rust for safety
			setAction({
				type: "sign_transaction",
				buttonLabel: "SIGN",
				payload: payload
			});
			//TODO: this should go to Rust as well
		};
		generateCards(payload);
	}, [payload]);

	const renderCard = ({ item }: { item: PayloadCardData }): ReactElement => {
		return (
			<View style={[{ paddingLeft: item.indent * 4 + '%' }]}>
				<PayloadCard type={item.type} payload={item.payload} />
			</View>
		);
	};

	const performAction = async (): Promise<void> => {
		console.log(action);
		switch (action.type) {
			case 'sign_transaction' : navigation.navigate('SignedTx', {payload: action});
			case '': navigation.goBack();
			default: return;
		}
	};

	return (
		<SafeAreaViewContainer testID={testIDs.DetailsTx.detailsScreen}>
			<Text style={styles.topTitle}>Extrinsic to sign</Text>
			<FlatList
				data={payloadCards}
				renderItem={renderCard}
				keyExtractor={(item: PayloadCardData): number => item.index.toString()}
			/>
			<Button
				disabled={action.buttonRole===''}
				onPress={performAction}
				title={action.buttonLabel}
				testID={testIDs.DetailsTx.signButton}
			/>
		</SafeAreaViewContainer>
	);
}

export default DetailsTx;
