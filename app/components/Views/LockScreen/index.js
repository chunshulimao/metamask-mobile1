import React, { PureComponent } from 'react';
import { StyleSheet, Dimensions, Animated, View, AppState } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import LottieView from 'lottie-react-native';
import Engine from '../../../core/Engine';
import SecureKeychain from '../../../core/SecureKeychain';
import { baseStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { NavigationActions } from 'react-navigation';

const LOGO_SIZE = 175;
const styles = StyleSheet.create({
	// eslint-disable-next-line react-native/no-unused-styles
	metamaskName: {
		marginTop: 10,
		height: 25,
		width: 170,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	logoWrapper: {
		marginTop: Dimensions.get('window').height / 2 - LOGO_SIZE / 2,
		height: LOGO_SIZE
	},
	foxAndName: {
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	animation: {
		width: 310,
		height: 310,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	animation1: {
		width: Dimensions.get('window').width,
		height: Dimensions.get('window').height,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	fox: {
		width: 110,
		height: 110,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	}
});
/**
 * Main view component for the Lock screen
 */
class LockScreen extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object,
		/**
		 * Boolean flag that determines if password has been set
		 */
		passwordSet: PropTypes.bool
	};

	state = {
		ready: false
	};

	appState = 'active';
	locked = true;
	timedOut = false;
	firstAnimation = React.createRef();
	secondAnimation = React.createRef();
	//animationName = React.createRef();
	opacity = new Animated.Value(1);
	unlockAttempts = 0;

	componentDidMount() {
		// Check if is the app is launching or it went to background mode
		this.appState = 'background';
		AppState.addEventListener('change', this.handleAppStateChange);
		this.mounted = true;
	}

	handleAppStateChange = async nextAppState => {
		// Try to unlock when coming from the background
		if (this.locked && this.appState !== 'active' && nextAppState === 'active') {
			this.firstAnimation.play();
			this.appState = nextAppState;
			// Avoid trying to unlock with the app in background
			this.unlockKeychain();
		}
	};

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this.handleAppStateChange);
	}

	async unlockKeychain() {
		this.unlockAttempts++;
		let credentials = null;
		try {
			// Retreive the credentials
			Logger.log('Lockscreen::unlockKeychain - getting credentials');
			credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				Logger.log('Lockscreen::unlockKeychain - got credentials', !!credentials.password);

				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				Logger.log('Lockscreen::unlockKeychain - submitting password');

				await KeyringController.submitPassword(credentials.password);
				Logger.log('Lockscreen::unlockKeychain - keyring unlocked');

				this.locked = false;
				await this.setState({ ready: true });
				Logger.log('Lockscreen::unlockKeychain - state: ready');
				this.secondAnimation && this.secondAnimation.play();
				// this.animationName && this.animationName.play();
				Logger.log('Lockscreen::unlockKeychain - playing animations');
			} else if (this.props.passwordSet) {
				this.props.navigation.navigate('Login');
			} else {
				this.props.navigation.navigate(
					'OnboardingRootNav',
					{},
					NavigationActions.navigate({ routeName: 'Onboarding' })
				);
			}
		} catch (error) {
			if (this.unlockAttempts <= 3) {
				this.unlockKeychain();
			} else {
				Logger.error(error, { message: 'Lockscreen:maxAttemptsReached', attemptNumber: this.unlockAttempts });
				this.props.navigation.navigate('Login');
			}
		}
	}

	onAnimationFinished = () => {
		setTimeout(() => {
			Animated.timing(this.opacity, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
				isInteraction: false
			}).start(() => {
				this.props.navigation.goBack();
			});
		}, 100);
	};

	renderAnimations() {
		if (!this.state.ready) {
			return (
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.firstAnimation = animation;
					}}
					style={styles.animation}
					source={require('../../../animations/bounce.json')}
				/>
			);
		}

		return (
			<View style={styles.foxAndName}>
				<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.secondAnimation = animation;
					}}
					style={styles.animation1}
					loop={false}
					source={require('../../../animations/fox-in.json')}
					onAnimationFinish={this.onAnimationFinished}
				/>
				{/*		<LottieView
					// eslint-disable-next-line react/jsx-no-bind
					ref={animation => {
						this.animationName = animation;
					}}
					style={styles.metamaskName}
					loop={false}
					source={require('../../../animations/bounce.json')}
				/>*/}
			</View>
		);
	}

	render() {
		return (
			<View style={baseStyles.flexGrow}>
				<Animated.View style={[styles.logoWrapper, { opacity: this.opacity }]}>
					<View style={styles.fox}>{this.renderAnimations()}</View>
				</Animated.View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	passwordSet: state.user.passwordSet
});

export default connect(
	mapStateToProps,
	null
)(LockScreen);
