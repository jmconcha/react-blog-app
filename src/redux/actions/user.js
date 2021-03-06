import { v4 as uuidv4 } from 'uuid';
import {
	LOADING_USER,
	DONE_LOADING_USER,
	USER_AUTHENTICATED,
	SET_USER_CREDENTIALS,
	SET_USER_NOTIFICATIONS,
	SET_USER_LIKES,
	USER_NOT_AUTHENTICATED,
	SET_USER_IMAGE_URL,
	SET_USER_DETAILS,
	ADD_USER_LIKE,
	REMOVE_USER_LIKE,
	MARK_NOTIFICATIONS_READ,
	REMOVE_NOTIFICATIONS,
} from '../types';
import {
	setBlogImageUrl,
	updateCommentImageUrl,
} from './data';
import {
	setErrors,
	clearErrors,
	loadingUI,
	doneLoadingUI,
} from './ui';
import {
	auth, 
	db, 
	storageRef, 
	imagesUrl
} from '../../util/firebase';
import {
	validateLogin,
	validateSignup,
	reduceUserDetails,
} from '../../util/validators';

export const loginUser = (userData, history) => (dispatch) => {
	dispatch(loadingUI());
	const { errors, isValid } = validateLogin(userData);
	if (isValid) {
		auth
			.signInWithEmailAndPassword(userData.email, userData.password)
			.then((cred) => {
				dispatch(clearErrors());
				dispatch(doneLoadingUI());
				history.push('/');
				dispatch(getUserData(cred.user.uid));

				return cred.user.getIdToken();
			})
			.then((idToken) => {
				setFBIdToken(idToken);
			})
			.catch((err) => {
				dispatch(doneLoadingUI());
				if (
					err.code === 'auth/wrong-password' ||
					err.code === 'auth/user-not-found' ||
					err.code === 'auth/invalid-email'
				) {
					dispatch(
						setErrors({ general: 'Wrong credentials. Please try again', })
					);
				} else {
					console.error(err);
				}
			});
	} else {
		dispatch(doneLoadingUI());
		dispatch(
			setErrors(errors)
		);
	}
};

export const getUserData = (userId) => (dispatch) => {
	dispatch({
		type: USER_AUTHENTICATED,
	});
	dispatch({
		type: LOADING_USER,
	});
	db
		.collection('users')
		.where('userId', '==', userId)
		.limit(1)
		.get()
		.then((userSnapshots) => {
			const userDoc = userSnapshots.docs[0];
			const userData = {
				username: userDoc.id,
				...userDoc.data(),
			};
			dispatch(
				setUserCredentials(userData)
			);
			dispatch({
				type: DONE_LOADING_USER,
			});
			dispatch(
				getUserLikes(userData.username)
			);
			dispatch(
				getUserNotifications(userData.username)
			);
		})
		.catch((err) => {
			dispatch({
				type: DONE_LOADING_USER,
			});
			console.error(err);
		});
};

const getUserLikes = (username) => (dispatch) => {
	db
		.collection('likes')
		.where('username', '==', username)
		.get()
		.then((likesSnapshot) => {
			const likesData = [];
			likesSnapshot.forEach((like) => {
				likesData.push({
					likeId: like.id,
					...like.data(),
				});
			});
			dispatch({
				type: SET_USER_LIKES,
				payload: likesData,
			})
		})
		.catch((err) => {
			console.error(err);
		});
};

const getUserNotifications = (recipient) => (dispatch) => {
	db
		.collection('notifications')
		.where('recipient', '==', recipient)
		.orderBy('createdAt', 'desc')
		.get()
		.then((notificationsSnapshot) => {
			const userNotifications = [];
			notificationsSnapshot.forEach((notif) => {
				userNotifications.push({
					notificationId: notif.id,
					...notif.data(),
				});
			});
			dispatch({
				type: SET_USER_NOTIFICATIONS,
				payload: userNotifications,
			});
		})
		.catch((err) => {
			console.error(err);
		});
};

export const signupUser = (newUserData, history) => (dispatch) => {
	dispatch(loadingUI());
	const { errors, isValid } = validateSignup(newUserData);
	if (isValid) {
		// checks first if username is available on firestore
		db
			.doc(`/users/${newUserData.username}`)
			.get()
			.then((userSnapshot) => {
				// checks if username is not taken
				if (!userSnapshot.exists) {
					// sign up user
					auth
						.createUserWithEmailAndPassword(newUserData.email, newUserData.password)
						.then((cred) => {
							newUserData.userId = cred.user.uid;
							return cred.user.getIdToken();
						})
						.then((idToken) => {
							setFBIdToken(idToken);
							dispatch(clearErrors())
							dispatch(doneLoadingUI());
							history.push('/');
							dispatch({
								type: LOADING_USER,
							});
							newUserData.imageUrl = `${imagesUrl}default.png?alt=media`;
							newUserData.createdAt = new Date().toISOString();
							// store new user data to firestore
							return db
								.collection('users')
								.doc(newUserData.username)
								.set({
									userId: newUserData.userId,
									email: newUserData.email,
									createdAt: newUserData.createdAt,
									imageUrl: newUserData.imageUrl,
								});
						})
						.then(() => {
							dispatch({
								type: USER_AUTHENTICATED,
							});
							dispatch(
								setUserCredentials({
									username: newUserData.username,
									imageUrl: newUserData.imageUrl,
									createdAt: newUserData.createdAt,
									email: newUserData.email,
									userId: newUserData.userId,
								})
							);
							dispatch({
								type: DONE_LOADING_USER,
							});
						})
						.catch((err) => {
							dispatch(doneLoadingUI());
							if (err.code === 'auth/email-already-in-use') {
								dispatch(
									setErrors({ email: 'Already taken. Please choose another email', })
								);
							} else {
								console.error(err);
							}
						});
				} else {
					dispatch(
						setErrors({ username: 'Already taken. Please choose another username', })
					);
					dispatch(doneLoadingUI());
				}
			})
			.catch((err) => {
				console.error(err);
			});
	} else {
		dispatch(doneLoadingUI());
		dispatch(
			setErrors(errors)
		);
	}
};

const setUserCredentials = (setUserCredentials) => (dispatch) => {
	dispatch({
		type: SET_USER_CREDENTIALS,
		payload: setUserCredentials,
	});
};

const setFBIdToken = (token) => {
	if (localStorage) {
		localStorage.setItem('FBIdToken', token);
	} else {
		console.log('token not save in localStorage');
	}
};

export const logoutUser = () => (dispatch) => {
	auth
		.signOut()
		.then(() => {
			localStorage.removeItem('FBIdToken');
			dispatch({
				type: USER_NOT_AUTHENTICATED,
			})
		})
		.catch((err) => {
			console.error(err);
		});
};

export const uploadImage = (imageFile, userId, oldImageUrl) => (dispatch) => {
	if (imageFile.type !== 'image/png' && imageFile.type !== 'image/jpeg') {
		return;
	}

	const metadata = {
    contentType: imageFile.type,
  };
  const imageExt = imageFile.name.split('.').pop();
  const filename = `${uuidv4()}.${imageExt}`;

	storageRef
		.child(`images/${filename}`)
		.put(imageFile, metadata)
		.then(() => {
			const imageUrl = `${imagesUrl}${filename}?alt=media`;
			dispatch({
				type: SET_USER_IMAGE_URL,
				payload: imageUrl,
			});

			// delete old image on storage bucket
			// checks if old image is not a default image
			if (!oldImageUrl.match('default.png')) {
				const filename = oldImageUrl.split('images%2F')[1].split('?alt=media')[0];
				storageRef
					.child(`images/${filename}`)
					.delete()
					.catch((err) => {
						console.error(err);
					});
			}


			// update user imageUrl
			db
				.doc(`/users/${userId}`)  
				.update({ imageUrl })
				.catch((err) => {
					console.error(err);
				});

			dispatch(setBlogImageUrl(userId, imageUrl));
			dispatch(updateCommentImageUrl(userId, imageUrl));
		})
		.catch((err) => {
			console.error(err);
		});
};

export const editUserDetails = (
	newUserDetails,
	oldUserDetails,
	userId
) => (dispatch) => {
	const userDetails = reduceUserDetails(newUserDetails, oldUserDetails);
	
	if (Object.keys(userDetails).length === 0) {
		return;
	}
	
	db
		.doc(`/users/${userId}`)
		.update(userDetails)
		.then(() => {
			dispatch({
				type: SET_USER_DETAILS,
				payload: userDetails,
			});
		})
		.catch((err) => {
			console.error(err);
		})
};

export const addUserLike = (likeData) => (dispatch) => {
	dispatch({
		type: ADD_USER_LIKE,
		payload: likeData,
	});
};

export const removeUserLike = (likeId) => (dispatch) => {
	dispatch({
		type: REMOVE_USER_LIKE,
		payload: likeId,
	});
};

export const markNotificationsRead = (unreadNotificationIds) => (dispatch) => {
	const batch = db.batch();
	unreadNotificationIds.forEach((notifId) => {
		batch.update(
			db.doc(`/notifications/${notifId}`),
			{ read: true }
		);
	});
	batch
	.commit()
	.then(() => {
		dispatch({
			type: MARK_NOTIFICATIONS_READ,
			payload: unreadNotificationIds,
		});
	})
	.catch((err) => {
		console.error(err);
	});
};

export const removeNotifications = (notificationIds) => (dispatch) => {
	dispatch({
		type: REMOVE_NOTIFICATIONS,
		payload: notificationIds,
	});
};