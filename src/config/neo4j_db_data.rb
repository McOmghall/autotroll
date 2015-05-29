module Config
  module Config::Neo4j
    def Neo4j.session_options
      {
        basic_auth: {
          username: 'neo4j',
          password: 'neoneo'
        }
      } 
    end

    def Neo4j.session_type
      :server_db 
    end
    
    def Neo4j.session_path
      'http://localhost:7474'
    end
  end
end
