import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import {Component} from "react";

const mapStyles = {
  width: '100%',
  height: '100%',
};

export class MapComponent extends Component<any, any> {
  constructor(props: any) {
    super(props);
    const { isLoaded } = useJsApiLoader({
      id: 'google-map-script',
      googleMapsApiKey: props.apiKey
    })
  }

  render = () => {
    return (
      <GoogleMap
        mapContainerStyle={mapStyles}
        // @ts-ignore
        zoom={4}
        center={{ lat: this.props.lat, lng:  this.props.lng}}
      >
        <Marker
          // @ts-ignore
          position={{ lat: this.props.lat, lng: this.props.lng}} />
        <Circle radius={this.props.radius} center={{ lat: this.props.lat, lng: this.props.lng}}/>
      </GoogleMap>
    );
  }
}
