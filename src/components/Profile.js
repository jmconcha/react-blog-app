import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import dayjs from 'dayjs';
import MyButton from '../util/MyButton';
import ImageUpload from './ImageUpload';
// MUI Components
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Avatar from '@material-ui/core/Avatar';
// MUI Icons
import PersonPinCircleIcon from '@material-ui/icons/PersonPinCircle';
import WebIcon from '@material-ui/icons/Web';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import EditIcon from '@material-ui/icons/Edit';


const styles = (theme) => ({
	...theme.myCSS,
	avatar: {
		width: 150,
		height: 150,
		marginBottom: 6,
	},
	paper: {
		padding: 20,
		marginLeft: 20,
		marginRight: 20,
	},
	imageContainer: {
		position: 'relative',
		display: 'flex',
		alignItems: 'center',
		flexDirection: 'column',
	},
	profileDetails: {
		textAlign: 'center',
		'& hr': {
			border: 'none',
			margin: '0 0 10px 0',
		},
		'& a': {
			color: '#00bcd4',
		},
		'& svg': {
			marginRight: 6,
			verticalAlign: 'middle',
		},
	},
	editButtonContainer: {
		display: 'flex',
		justifyContent: 'flex-end',
	},
});

const Profile = ({
	classes,
	loading,
	authenticated,
	user: {
		imageUrl,
		username,
		bio,
		location,
		website,
		createdAt,
	},
}) => {
	const profileMarkup = loading ? (
		<p>loading...</p>
	) : (
		authenticated ? (
			<Fragment>
				<div className={classes.imageContainer}>
					<Avatar aria-label="Profile Picture" className={classes.avatar}>
		        <img src={imageUrl} alt='Profile Picture' className={classes.profileImage} />
		      </Avatar>
		      <ImageUpload />
				</div>
	      <div className={classes.profileDetails}>
	      	<Typography variant='h5' color='primary'>
		      	{username}
		      </Typography>
		      <hr />
	      	{bio && (
		      	<Fragment>
		      		<Typography variant='body1' color='inherit'>
				      	{bio}
				      </Typography>
		      		<hr />
		      	</Fragment>
		      )}
		      {website && (
		      	<Fragment>
			      	<WebIcon color='primary' />
			      	<a href={website} target='_blank' rel='noopener norefferer'>
			      		{website}
			      	</a>
		      		<hr />
		      	</Fragment>
		      )}
		      {location && (
		      	<Fragment>
			      	<PersonPinCircleIcon color='primary' />
			      	<span>{location}</span>
		      		<hr />
		      	</Fragment>
		      )}
		      <CalendarTodayIcon color='primary' />
		      <span>Joined {dayjs(createdAt).format('MMM DD YYYY')}</span>
		      <hr />
		      <div className={classes.editButtonContainer}>
		      	<MyButton tip='Edit Details'>
			      	<EditIcon color='primary' />
			      </MyButton>
		      </div>
	      </div>
			</Fragment>
		) : (
			<Fragment>
				<div>no profile</div>
			</Fragment>
		)
	);

	return (
		<Paper className={classes.paper}>
			{profileMarkup}
		</Paper>
	);
};
Profile.propTypes = {
	classes: PropTypes.object.isRequired,
	loading: PropTypes.bool.isRequired,
	authenticated: PropTypes.bool.isRequired,
	user: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	loading: state.user.loading,
	authenticated: state.user.authenticated,
	user: state.user.credentials,
});

export default connect(
	mapStateToProps
)(withStyles(styles)(Profile));