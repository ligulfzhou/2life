import React, { Component } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActionSheetIOS,
  Alert,
  DeviceEventEmitter,
  Modal,
  Animated
} from 'react-native'
import { connect } from 'react-redux'
import { Actions } from 'react-native-router-flux'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import ImageViewer from 'react-native-image-zoom-viewer'

import Container from '../../components/Container'
import TextPingFang from '../../components/TextPingFang'
import CommonNav from '../../components/CommonNav'
import DiaryBanner from './DiaryBanner'

import {
  WIDTH,
  getResponsiveWidth,
} from '../../common/styles'
import { SCENE_INDEX, SCENE_UPDATE_DIARY } from '../../constants/scene'
import { getMonth, getLocation, updateReduxUser } from '../../common/util'

import HttpUtils from '../../network/HttpUtils'
import { NOTES } from '../../network/Urls'

function mapStateToProps(state) {
  return {
    user: state.user,
    partner: state.partner
  }
}

@connect(mapStateToProps)
export default class DiaryDetail extends Component {

  state = {
    showBanner: false,
    imageList: [],
    likeComponent: null,
    mode: '',
    mode_face: require('../../../res/images/home/icon_happy.png'),
    changeMode: false,
    showImgPreview: false,
    modeWidth: new Animated.Value(0),
    modeOpacity: new Animated.Value(0)
  }

  async componentWillMount() {
    const diary = this.props.diary

    if (diary.images) {
      let imageList = diary.images.split(',').filter(url => !!url)
      this.setState({ imageList, showBanner: true })
    } else {
      this.setState({ showBanner: false })
    }

    if (diary.mode >= 0 && diary.mode <= 20) this.setState({mode_face: require('../../../res/images/home/icon_very_sad_male.png')})
    if (diary.mode > 20 && diary.mode <= 40) this.setState({mode_face: require('../../../res/images/home/icon_sad_male.png')})
    if (diary.mode > 40 && diary.mode <= 60) this.setState({mode_face: require('../../../res/images/home/icon_normal_male.png')})
    if (diary.mode > 60 && diary.mode <= 80) this.setState({mode_face: require('../../../res/images/home/icon_happy_male.png')})
    if (diary.mode > 80 && diary.mode <= 100) this.setState({mode_face: require('../../../res/images/home/icon_very_happy_male.png')})

    this.setState({mode: diary.mode.toString()})

    this.renderlikeComponent(diary.is_liked)
  }

  updateNote(mode, mode_face) {
    const data = {
      note_id: this.props.diary.id,
      title: this.props.diary.title,
      content: this.props.diary.content,
      images: this.props.diary.images,
      mode
    }
    HttpUtils.post(NOTES.update, data).then(res => {
      if (res.code === 0) {
        updateReduxUser(this.props.user.id)

        // Alert.alert('', '修改成功')
        
        this.setState({
          changeMode: false,
          mode,
          mode_face
        })
        this.toggleChooseMode()
        DeviceEventEmitter.emit('flash_note', {})
      }
    })
  }

  showOptions() {
    const options = {
      options: ['修改日记', '删除日记', '取消'],
      cancelButtonIndex: 2,
      destructiveButtonIndex: 1
    }
    ActionSheetIOS.showActionSheetWithOptions(options, index => {
      if (index === 0) Actions.jump(SCENE_UPDATE_DIARY, {diary: this.props.diary})
      if (index === 1) {
        Alert.alert(
          '',
          '确定要删除这篇日记吗？',
          [
            {
              text: '取消',
              onPress: () => {}
            },
            {
              text: '确定',
              onPress: () => {
                HttpUtils.get(NOTES.delete, {note_id: this.props.diary.id}).then(res => {
                  if (res.code === 0) {
                    updateReduxUser(this.props.user.id)
                    Actions.reset(SCENE_INDEX)
                  }
                })
              }
            },
          ]
        )
      }
      if (index === 3) return
    })
  }

  likeNote() {
    HttpUtils.post(NOTES.like, {note_id: this.props.diary.id}).then(res => {
      if (res.code === 0) {
        DeviceEventEmitter.emit('flush_note', {})
        this.renderlikeComponent(true)
      }
    })
  }

  renderRightButton() {
    if (this.props.user.id === this.props.diary.user_id) {
      return (
        <TouchableOpacity
          style={styles.nav_right}
          onPress={() => this.showOptions()}
        >
          <Image source={require('../../../res/images/common/icon_more_black.png')}/>
        </TouchableOpacity>
      )
    }
  }

  renderlikeComponent(isLiked) {
    let likeComponent
    if (isLiked) {
      likeComponent = (
        <TouchableOpacity>
          <Image style={styles.img_btn} source={require('../../../res/images/home/icon_liked.png')}/>
        </TouchableOpacity>
      )
    } else {
      likeComponent = (
        <TouchableOpacity onPress={() => this.likeNote()}>
          <Image style={styles.img_btn} source={require('../../../res/images/home/icon_like.png')}/>
        </TouchableOpacity>
      )
    }
    this.setState({ likeComponent })
  }

  toggleChooseMode() {
    this.setState({changeMode: !this.state.changeMode})
    Animated.parallel([
      Animated.spring(
        this.state.modeWidth,
        {
          toValue: this.state.changeMode ? 0 : getResponsiveWidth(250),
          duration: 300
        }
      ),
      Animated.timing(
        this.state.modeOpacity,
        {
          toValue: this.state.changeMode ? 0 : 1,
          duration: 300
        }
      )
    ]).start()
  }

  render() {
    return (
      <Container hidePadding={this.state.showBanner}>
        <KeyboardAwareScrollView>
          <TouchableOpacity onPress={() => this.setState({showImgPreview: true})}>
            <DiaryBanner
              showBanner={this.state.showBanner}
              imageList={this.state.imageList}
              showNav={true}
              rightButton={this.renderRightButton()}
            />
          </TouchableOpacity>

          <CommonNav
            navStyle={[styles.nav_style, { display: this.state.showBanner ? 'none' : 'flex' }]}
            navBarStyle={styles.navbar_style}
            rightButton={this.renderRightButton()}
          />

          <View style={styles.date_container}>
            <TextPingFang
              style={styles.text_date}>{getMonth(new Date(this.props.diary.date).getMonth())} </TextPingFang>
            <TextPingFang style={styles.text_date}>{new Date(this.props.diary.date).getDate()}，</TextPingFang>
            <TextPingFang style={styles.text_date}>{new Date(this.props.diary.date).getFullYear()}</TextPingFang>
          </View>

          <TextPingFang style={styles.text_title}>{this.props.diary.title}</TextPingFang>

          <View style={[styles.partner_container, { display: this.props.diary.user_id !== this.props.user.id ? 'flex' : 'none'}]}>
            <Image style={styles.partner_face} source={{uri: this.props.partner.face}}/>
            <TextPingFang style={styles.text_name}>{this.props.partner.name}</TextPingFang>
          </View>

          <View style={[styles.partner_container, { display: this.props.diary.user_id !== this.props.user.id ? 'none' : 'flex'}]}>
            <Image style={styles.partner_face} source={{uri: this.props.user.face}}/>
            <TextPingFang style={styles.text_name}>{this.props.user.name}</TextPingFang>
          </View>

          <View style={styles.line}/>

          <TextPingFang style={styles.text_content}>{this.props.diary.content}</TextPingFang>

          <View style={styles.location_container}>
            <Image style={styles.location_icon} source={require('../../../res/images/home/icon_location.png')}/>
            <TextPingFang style={styles.text_location}>{this.props.diary.location}</TextPingFang>
          </View>

          <View style={styles.mode_container}>
            <Image style={styles.location_icon} source={this.state.mode_face}/>
            <TextPingFang style={styles.text_mode}>{this.state.mode}</TextPingFang>
            <TextPingFang style={styles.text_value}>情绪值</TextPingFang>
            <TouchableOpacity
              style={[styles.update_container, { display: this.props.user.id === this.props.diary.user_id ? 'flex' : 'none' }]}
              onPress={() => this.toggleChooseMode()}
            >
              <TextPingFang style={styles.text_update}>更正</TextPingFang>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn_container, { display: this.props.user.id !== this.props.diary.user_id ? 'flex' : 'none' }]}
            >
              {this.state.likeComponent}
            </TouchableOpacity>

            <Animated.View style={[
              styles.choose_mode,
              {
                width: this.state.modeWidth,
                opacity: this.state.modeOpacity
              }
            ]}>
              <TouchableOpacity
                style={styles.mode_item}
                onPress={() => this.updateNote(0, require('../../../res/images/home/icon_very_sad_male.png'))}
              >
                <Image source={require('../../../res/images/home/icon_very_sad_male.png')}/>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mode_item}
                onPress={() => this.updateNote(25, require('../../../res/images/home/icon_sad_male.png'))}
              >
                <Image source={require('../../../res/images/home/icon_sad_male.png')}/>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mode_item}
                onPress={() => this.updateNote(50, require('../../../res/images/home/icon_normal_male.png'))}
              >
                <Image source={require('../../../res/images/home/icon_normal_male.png')}/>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mode_item}
                onPress={() => this.updateNote(75, require('../../../res/images/home/icon_happy_male.png'))}
              >
                <Image source={require('../../../res/images/home/icon_happy_male.png')}/>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mode_item}
                onPress={() => this.updateNote(100, require('../../../res/images/home/icon_very_happy_male.png'))}
              >
                <Image source={require('../../../res/images/home/icon_very_happy_male.png')}/>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAwareScrollView>

        <Modal
          visible={this.state.showImgPreview}
          transparent={false}
          animationType={'fade'}
        >
          <ImageViewer
            imageUrls={this.state.imageList.map(url => {
              return {url: url}
            })}
            enableSwipeDown={true}
            onSwipeDown={() => this.setState({showImgPreview: false})}
            onClick={() => this.setState({showImgPreview: false})}
          />
        </Modal>

      </Container>
    )
  }
}

const styles = StyleSheet.create({
  nav_right: {
    justifyContent: 'center',
    height: getResponsiveWidth(30)
  },
  date_container: {
    width: WIDTH,
    flexDirection: 'row',
    paddingLeft: getResponsiveWidth(24),
    paddingTop: getResponsiveWidth(24),
    paddingBottom: getResponsiveWidth(24),
  },
  text_date: {
    color: '#aaa',
    fontSize: 12
  },
  text_title: {
    color: '#000',
    fontSize: 24,
    fontWeight: '400',
    paddingLeft: getResponsiveWidth(24),
    paddingRight: getResponsiveWidth(24),
    paddingTop: getResponsiveWidth(48),
  },
  partner_container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: getResponsiveWidth(24),
    marginTop: getResponsiveWidth(8),
    marginBottom: getResponsiveWidth(48),
  },
  partner_face: {
    width: getResponsiveWidth(24),
    height: getResponsiveWidth(24),
    borderRadius: getResponsiveWidth(12)
  },
  text_name: {
    marginLeft: getResponsiveWidth(8),
    color: '#000',
    fontSize: 14,
    fontWeight: '400'
  },
  line: {
    width: getResponsiveWidth(40),
    height: getResponsiveWidth(1),
    marginLeft: getResponsiveWidth(24),
    backgroundColor: '#aaa'
  },
  text_content: {
    color: '#444',
    fontSize: 16,
    paddingLeft: getResponsiveWidth(24),
    paddingRight: getResponsiveWidth(24),
    marginTop: getResponsiveWidth(24),
    paddingBottom: getResponsiveWidth(24),
  },
  location_container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: getResponsiveWidth(24),
  },
  location_icon: {
    marginRight: getResponsiveWidth(8)
  },
  text_location: {
    color: '#000',
    fontSize: 10,
    fontWeight: '300'
  },
  mode_container: {
    height: getResponsiveWidth(88),
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: getResponsiveWidth(24),
    marginRight: getResponsiveWidth(24),
    marginTop: getResponsiveWidth(16),
    borderBottomWidth: getResponsiveWidth(1),
    borderBottomColor: '#f5f5f5'
  },
  text_mode: {
    width: getResponsiveWidth(30),
    marginLeft: getResponsiveWidth(15),
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold'
  },
  text_value: {
    marginLeft: getResponsiveWidth(8),
    color: '#000',
    fontSize: 16,
    fontWeight: '300'
  },
  update_container: {
    position: 'absolute',
    right: 0,
  },
  text_update: {
    color: '#2DC3A6',
    fontSize: 16
  },
  btn_container: {
    position: 'absolute',
    right: 0,
    top: getResponsiveWidth(24)
  },
  img_btn: {
    width: getResponsiveWidth(64),
    height: getResponsiveWidth(64)
  },
  choose_mode: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff'
  }
})
